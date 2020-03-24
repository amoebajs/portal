import * as path from "path";
import * as fs from "fs-extra";
import chalk from "chalk";
import moment from "moment";
import { Injectable } from "@nestjs/common";
import { IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { Configs } from "#services/configs";
import { PageManager, PagePersistence, IWebsitePageHash } from "#services/manager";
import { MysqlWorker } from "#services/database";
import { ICompileTask, TaskStatus } from "#database/typings";
import { Page } from "#database/entity/page.entity";
import { PageConfig } from "#database/entity/page-config.entity";
import { BuilderFactory } from "./core";
import { CompileService, ICommonBuildConfigs, ISourceCreateResult } from "./compiler";

const ASSETS_DIR = path.resolve(__dirname, "..", "..", "assets");

@Injectable()
export class CoreCompiler implements CompileService<ICompileTask> {
  protected _factory = new BuilderFactory();
  protected _init = false;
  protected _working = false;
  protected _isProd = true;
  protected _taskLogs: Record<string | number, string[]> = {};

  private get builder() {
    return this._factory.builder;
  }

  constructor(
    protected readonly configs: Configs,
    protected readonly worker: MysqlWorker,
    protected readonly manager: PageManager,
    protected readonly persistence: PagePersistence,
  ) {
    worker.active.subscribe(() => {
      this._init = true;
    });
    configs.config.subscribe(configs => {
      this._isProd = configs.envMode === "prod";
    });
    this.init();
  }

  private async init() {
    const websites = path.join(ASSETS_DIR, "website");
    if (!(await fs.pathExists(websites))) {
      await fs.mkdir(websites);
    }
  }

  public async queryPageUri(name: string) {
    try {
      let page = this.manager.getPage(name);
      if (!page) {
        const pageR = await this.worker.query("PAGE", { name });
        this.manager.updatePage(name, { latest: String(pageR.versionId) });
        page = this.manager.getPage(name);
      }
      const version = page?.latest;
      if (page?.status !== "loaded") {
        await this.saveHtmlBundle(name, version);
      }
      return version && `website/${name}.${version}.html`;
    } catch (error) {
      console.log(error);
      throw new Error(`query page uri failed: ${error.message.slice(0, 50)}`);
    }
  }

  public async createCompileTask(configs: ICommonBuildConfigs): Promise<string | number> {
    if (!this._init) {
      throw new Error("core-compiler is not init");
    }
    if (this._working) {
      throw new Error("core-compiler is still on working for previous task");
    }
    const { name, displayName, description, options } = configs;
    this._working = true;
    const pageId = await this.createUpdatePage(name, displayName, description, configs, options);
    const taskId = await this.worker.createTask({ pageId, operator: configs.creator });
    const success = await this.worker.startTask({ id: taskId, operator: configs.creator });
    if (success) {
      const task = await this.worker.query("TASK", { id: taskId });
      this.runCustomTask(task).finally(async () => {
        await this.worker.updateTask({
          id: task.id,
          operator: configs.creator,
          logs: (this._taskLogs[task.id] ?? []).join("\n"),
        });
        this._working = false;
      });
    } else {
      throw new Error("Task exist with status [pending]");
    }
    return taskId;
  }

  private async createUpdatePage(
    name: string,
    displayName: string,
    description: string,
    configs: ICommonBuildConfigs,
    options: IPageCreateOptions,
  ) {
    let page = await this.worker.query("PAGE", { name });
    let pageId = page?.id;
    if (!page) {
      pageId = await this.worker.createPage({
        name,
        displayName,
        description,
        operator: configs.creator,
        configs: options,
      });
    } else {
      const success = await this.worker.updatePageDetails({ id: page.id, name, description, displayName });
      if (success) {
        page.name = name ?? page.name;
        page.displayName = displayName ?? page.displayName;
        page.description = description ?? page.description;
      }
    }
    return pageId;
  }

  public async queryCompileTask(id: string | number): Promise<ICompileTask> {
    return this.worker.query("TASK", { id });
  }

  public async queryCompileTaskLogs(id: string | number): Promise<string> {
    if (this._taskLogs[id] !== void 0) {
      return this._taskLogs[id].join("\n");
    }
    const task = await this.worker.query("TASK", { id });
    this._taskLogs[id] = [task.logs];
    return task.logs;
  }

  public async createSourceString(
    configs: IPageCreateOptions,
    transpile: Partial<ISourceCreateTranspileOptions> = { enabled: false },
  ): Promise<ISourceCreateResult> {
    const { sourceCode, dependencies } = await this.builder.createSource({
      configs,
      transpile,
    });
    return { source: sourceCode, dependencies };
  }

  protected async runCustomTask(task: ICompileTask) {
    const tempSrcDir = getSrcDir(String(task.id));
    const tempBuildDir = getBuildDir(String(task.id));
    const exist = await fs.pathExists(tempSrcDir);
    if (!exist) {
      fs.mkdirSync(tempSrcDir, { recursive: true });
    }
    return this.runCommonBuildWorkAsync(task, tempSrcDir, tempBuildDir);
  }

  protected async runCommonBuildWorkAsync(task: ICompileTask, srcDir: string, buildDir: string) {
    const stamp = new Date().getTime();
    try {
      this.pushTaskLog(task.id, "task is now running.", "blue");
      const page = await this.worker.query("PAGE", { id: task.pageId });
      const cache = await this.getPageManagerCache(page);
      const config = await this.worker.query("CONFIG", { id: task.configId });
      const entry = path.join(srcDir, "main.tsx");
      this.pushTaskLog(task.id, "starting to compile source code...", "blue");
      const result = await this.generateAndEmitCode(config, entry);
      this.pushTaskLog(task.id, "source code compiled successfully.", "blue");
      await this.buildAppDist(task.id, page, entry, buildDir, result.dependencies);
      await this.bundleAppDist(buildDir, cache, task);
      await this.handletaskEnd(task, cache, page, buildDir, config);
      console.log(JSON.stringify({ ...cache, config: "[hidden]" }, null, "  "));
      const cost = this.getSecondsCost(stamp);
      this.pushTaskLog(task.id, `task end with status [${task.status}] in ${cost}s.`, "green");
      return true;
    } catch (error) {
      console.log(error);
      await this.worker.endTask({ id: task.id, operator: task.creator, status: TaskStatus.Failed, dist: "{}" });
      const cost = this.getSecondsCost(stamp);
      this.pushTaskLog(task.id, `task end with status [${task.status}] in ${cost}s.`, "red");
      this.pushTaskLog(task.id, `task is failed.`, "yellow");
      return error;
    }
  }

  private async handletaskEnd(
    task: ICompileTask,
    cache: IWebsitePageHash,
    page: Page,
    buildDir: string,
    config: PageConfig,
  ) {
    try {
      await this.worker.endTask({
        id: task.id,
        operator: task.creator,
        dist: JSON.stringify(cache.files),
      });
      const version = String(task.versionId);
      await this.moveHtmlBundle(page.name, version, buildDir);
      this.manager.updatePage(page.name, { config: config.data, latest: version, status: "loaded" });
    } catch (error) {
      throw new Error(`end task failed: ${error.message}`);
    }
  }

  protected async bundleAppDist(buildDir: string, cache: IWebsitePageHash, task: ICompileTask) {
    let isHashChanged = true;
    await this.builder.htmlBundle.build({
      path: path.join(buildDir, "index.html"),
      outPath: path.join(buildDir, "index.bundle.html"),
      scripts: [
        { match: /app\.[a-z0-9]+\.js/, path: n => path.join(buildDir, n) },
        { match: /vendor\.[a-z0-9]+\.js/, path: n => path.join(buildDir, n) },
      ],
      //#region 这里处理hash变更的判断，暂时全部忽略，后续再考虑
      checkUnchange: (match, value) => {
        if (cache.files[match as string] !== value) {
          // return true;
          this.pushTaskLog(task.id, `find a change changed --> [${value}]`, "gray");
        }
        cache.files[match as string] = value;
        return false;
      },
      shouldBundle: ps => {
        isHashChanged = ps.length > 0;
        // return ps.length > 0;
        return true;
      },
    });
    if (!isHashChanged) {
      this.pushTaskLog(task.id, "find no file changed.", "gray");
    }
    return isHashChanged;
  }

  protected async buildAppDist(
    id: string | number,
    page: Page,
    entry: string,
    buildDir: string,
    dependencies: Record<string, any>,
  ) {
    await this.builder.buildSource({
      template: { title: page.displayName || "测试" },
      entry: { app: entry },
      output: { path: buildDir, filename: "[name].[hash].js" },
      plugins: [
        this.builder.webpackPlugins.createProgressPlugin({
          type: "trigger",
          trigger: data => this.pushTaskLog(id, data, "gray"),
        }),
      ],
      typescript: { compilerOptions: { outDir: "temp-dist" } },
      sandbox: {
        rootPath: getNpmSandbox(),
        dependencies,
        install: {
          type: "trigger",
          trigger: data => this.pushTaskLog(id, data, "gray"),
        },
      },
    });
  }

  protected async generateAndEmitCode(config: PageConfig, targetFile: string) {
    const result = await this.builder.createSource({ configs: JSON.parse(config.data) });
    await fs.writeFile(targetFile, result.sourceCode, { encoding: "utf8", flag: "w+" });
    return result;
  }

  protected pushTaskLog(
    id: number | string,
    content: string,
    color: "green" | "blue" | "yellow" | "red" | "gray" = "green",
  ) {
    if (this._taskLogs[id] === void 0) {
      this._taskLogs[id] = [];
    }
    const msg = `[${moment(new Date()).format("YYYY-MM-DD HH:mm:ss")}] [task:${id}] ${content}`;
    this._taskLogs[id].push(msg);
    if (!this._isProd) {
      console.log(chalk[color](msg));
    }
  }

  protected async getPageManagerCache(page: Page) {
    let cache = this.manager.getPage(page.name);
    if (!cache) {
      const updates: Partial<IWebsitePageHash> = { latest: null, status: "loading" };
      const prever = await this.worker.query("VERSION", { id: page.versionId });
      const preconf = await this.worker.query("CONFIG", { id: page.configId });
      if (prever) {
        updates.latest = String(prever.id);
        updates.config = preconf.data || "{}";
        updates.files = JSON.parse(prever.dist);
      }
      this.manager.updatePage(page.name, updates);
      cache = this.manager.getPage(page.name);
    }
    return cache;
  }

  protected delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  protected getSecondsCost(start: number) {
    return (new Date().getTime() - start) / 1000;
  }

  protected async moveHtmlBundle(name: string, id: string | number, buildDir: string) {
    const filepath = path.join(buildDir, "index.bundle.html");
    await this.persistence.setFile(id, filepath);
    return fs.copy(filepath, path.join(ASSETS_DIR, "website", `${name}.${id}.html`), { overwrite: true });
  }

  protected async saveHtmlBundle(name: string, id: string | number) {
    const stream = await this.persistence.getFile(id);
    const emitfile = path.join(ASSETS_DIR, "website", `${name}.${id}.html`);
    await fs.writeFile(emitfile, "", { encoding: "utf8", flag: "w+" });
    return new Promise<void>(resolve => {
      const output = fs.createWriteStream(emitfile, { flags: "w+" });
      stream.on("data", e => {
        output.write(e.data.toString());
      });
      stream.on("end", function() {
        output.end();
      });
      output.on("close", () => {
        resolve();
      });
    });
  }
}

function getNpmSandbox() {
  return path.resolve(__dirname, "..", "..", "temp");
}

function getSrcDir(id: string) {
  return path.resolve(getNpmSandbox(), id, "src");
}

function getBuildDir(id: string) {
  return path.resolve(getNpmSandbox(), id, "build");
}
