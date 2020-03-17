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
      const pageR = await this.worker.queryPage({ name });
      this.manager.updatePage(name, { latest: String(pageR.versionId) });
      page = this.manager.getPage(name);
    }
    const version = page?.latest;
    return version && `website/${name}.${version}.html`;
  }

  public async createTask(configs: ICommonBuildConfigs): Promise<string> {
    if (!this._init) {
      throw new Error("core-compiler is not init");
    }
    if (this._working) {
      throw new Error("core-compiler is still on working for previous task");
    }
    const { name, options } = configs;
    this._working = true;
    const taskId = await this.worker.startTask({ name, operator: configs.creator, data: options });
    const task = await this.worker.queryTask({ id: taskId });
    this.runCustomTask(task);
    return taskId;
  }

  public async queryTask(id: string): Promise<ICompileTask> {
    return this.worker.queryTask({ id });
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
    const page = await this.worker.queryPage({ id: task.pageId });
    let cache = this.manager.getPage(page.name);
    if (!cache) {
      const updates: Partial<IWebsitePageHash> = { latest: null };
      const prever = await this.worker.queryVersion({ id: page.versionId });
      if (prever) {
        updates.latest = String(prever.id);
        updates.config = prever.data || "{}";
        updates.files = JSON.parse(prever.dist);
      }
      this.manager.updatePage(page.name, updates);
      cache = this.manager.getPage(page.name);
    }
    const curver = await this.worker.queryVersion({ id: task.versionId });
    try {
      const targetFile = path.join(srcDir, "main.tsx");
      console.log(chalk.blue(`[COMPILE-TASK] task[${task.id}] is now running.`));
      const { sourceCode, dependencies } = await this.builder.createSource({
        configs: JSON.parse(curver.data),
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
      let shouldMoveBundle = true;
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
          if (ps.length > 0) {
            return true;
          }
          console.log(`[COMPILE-TASK] task[${task.id}] find no file changed.`);
          return (shouldMoveBundle = false);
        },
      });
      if (shouldMoveBundle) {
        await this.worker.createUpdateVersion({
          id: curver.id,
          dist: JSON.stringify(cache.files),
        });
        const version = String(curver.id);
        // 后期要做成版本控制，暂时直接绑定新版本
        await this.worker.createUpdatePage({ id: page.id, versionId: version });
        this.manager.updatePage(page.name, { latest: version });
        await this.moveHtmlBundle(page.name, version, buildDir);
      }
      await this.worker.endTask({ id: task.id, operator: task.creator });
      console.log(JSON.stringify(cache, null, "  "));
      const cost = this.getSecondsCost(stamp);
      console.log(chalk.green(`[COMPILE-TASK] task[${task.id}] end with status [${task.status}] in ${cost}s`));
      return true;
    } catch (error) {
      console.log(error);
      await this.worker.endTask({ id: task.id, operator: task.creator, status: TaskStatus.Failed });
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
