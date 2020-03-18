import * as path from "path";
import * as fs from "fs-extra";
import chalk from "chalk";
import { Injectable } from "@nestjs/common";
import { IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { CompileService, ICommonBuildConfigs, ISourceCreateResult } from "#global/services/compile.service";
import { BuilderFactory } from "#core/index";
import { PageManager, IWebsitePageHash } from "#global/services/page.service";
import { MysqlWorker } from "#database/providers/worker.service";
import { ICompileTask, TaskStatus } from "#database/typings";

const ASSETS_DIR = path.resolve(__dirname, "..", "..", "assets");

@Injectable()
export class CoreCompiler implements CompileService<ICompileTask> {
  private _factory = new BuilderFactory();

  private _init = false;
  private _working = false;

  private get builder() {
    return this._factory.builder;
  }

  constructor(protected readonly worker: MysqlWorker, protected readonly manager: PageManager) {
    worker.active.subscribe(async active => {
      if (active) {
        this._init = true;
      }
    });
  }

  public async queryPageUri(name: string) {
    let page = this.manager.getPage(name);
    if (!page) {
      const pageR = await this.worker.query("PAGE", { name });
      this.manager.updatePage(name, { latest: String(pageR.versionId) });
      page = this.manager.getPage(name);
    }
    const version = page?.latest;
    return version && `website/${name}.${version}.html`;
  }

  public async createTask(configs: ICommonBuildConfigs): Promise<string | number> {
    if (!this._init) {
      throw new Error("core-compiler is not init");
    }
    if (this._working) {
      throw new Error("core-compiler is still on working for previous task");
    }
    const { name, options } = configs;
    this._working = true;
    const page = await this.worker.query("PAGE", { name });
    const pageId = !page
      ? await this.worker.createPage({ name, operator: configs.creator, configs: options })
      : page.id;
    const taskId = await this.worker.createTask({ pageId, operator: configs.creator });
    const success = await this.worker.startTask({ id: taskId, operator: configs.creator });
    if (success) {
      const task = await this.worker.query("TASK", { id: taskId });
      this.runCustomTask(task);
    } else {
      throw new Error("Task exist with status [pending]");
    }
    return taskId;
  }

  public async queryTask(id: string): Promise<ICompileTask> {
    return this.worker.query("TASK", { id });
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

  private async runCustomTask(task: ICompileTask) {
    const tempSrcDir = getSrcDir(String(task.id));
    const tempBuildDir = getBuildDir(String(task.id));
    const exist = await fs.pathExists(tempSrcDir);
    if (!exist) {
      fs.mkdirSync(tempSrcDir, { recursive: true });
    }
    await this.runCommonBuildWorkAsync(task, tempSrcDir, tempBuildDir);
  }

  protected async runCommonBuildWorkAsync(task: ICompileTask, srcDir: string, buildDir: string) {
    const stamp = new Date().getTime();
    const page = await this.worker.query("PAGE", { id: task.pageId });
    let cache = this.manager.getPage(page.name);
    if (!cache) {
      const updates: Partial<IWebsitePageHash> = { latest: null };
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
    const curconf = await this.worker.query("CONFIG", { id: task.configId });
    try {
      const targetFile = path.join(srcDir, "main.tsx");
      console.log(chalk.blue(`[COMPILE-TASK] task[${task.id}] is now running.`));
      const { sourceCode, dependencies } = await this.builder.createSource({
        configs: JSON.parse(curconf.data),
      });
      await fs.writeFile(targetFile, sourceCode, { encoding: "utf8", flag: "w+" });
      console.log(chalk.blue(`[COMPILE-TASK] task[${task.id}] compile successfully.`));
      await this.builder.buildSource({
        template: { title: "测试" },
        entry: { app: targetFile },
        output: { path: buildDir, filename: "[name].[hash].js" },
        plugins: [this.builder.webpackPlugins.createProgressPlugin()],
        typescript: { compilerOptions: { outDir: "temp-dist" } },
        sandbox: {
          rootPath: getNpmSandbox(),
          dependencies,
        },
      });
      let isHashChanged = true;
      await this.builder.htmlBundle.build({
        path: path.join(buildDir, "index.html"),
        outPath: path.join(buildDir, "index.bundle.html"),
        scripts: [
          { match: /app\.[a-z0-9]+\.js/, path: n => path.join(buildDir, n) },
          { match: /vendor\.[a-z0-9]+\.js/, path: n => path.join(buildDir, n) },
        ],
        checkUnchange: (match, value) => {
          if (cache.files[match as string] === value) {
            return true;
          }
          cache.files[match as string] = value;
          console.log(`[COMPILE-TASK] task[${task.id}] find a change changed --> [${value}]`);
          return false;
        },
        shouldBundle: ps => {
          isHashChanged = ps.length > 0;
          // 无论如何都要输出chunk
          return true;
        },
      });
      if (!isHashChanged) {
        console.log(`[COMPILE-TASK] task[${task.id}] find no file changed.`);
      }
      await this.worker.endTask({
        id: task.id,
        operator: task.creator,
        dist: JSON.stringify(cache.files),
      });
      const version = String(task.versionId);
      this.manager.updatePage(page.name, { config: curconf.data, latest: version });
      await this.moveHtmlBundle(page.name, version, buildDir);
      console.log(JSON.stringify({ ...cache, config: "[hidden]" }, null, "  "));
      const cost = this.getSecondsCost(stamp);
      console.log(chalk.green(`[COMPILE-TASK] task[${task.id}] end with status [${task.status}] in ${cost}s`));
      return true;
    } catch (error) {
      console.log(error);
      await this.worker.endTask({ id: task.id, operator: task.creator, status: TaskStatus.Failed, dist: "{}" });
      const cost = this.getSecondsCost(stamp);
      console.log(chalk.red(`[COMPILE-TASK] task[${task.id}] end with status [${task.status}]  in ${cost}s`));
      console.log(chalk.yellow(`[COMPILE-TASK] task[${task.id}] failed.`));
      return error;
    }
  }

  protected delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  protected getSecondsCost(stamp: number) {
    return (new Date().getTime() - stamp) / 1000;
  }

  protected async moveHtmlBundle(name: string, id: string, buildDir: string) {
    return fs.copy(path.join(buildDir, "index.bundle.html"), path.join(ASSETS_DIR, "website", `${name}.${id}.html`), {
      overwrite: true,
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
