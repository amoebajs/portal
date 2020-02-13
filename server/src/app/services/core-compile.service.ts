import * as path from "path";
import * as fs from "fs-extra";
import chalk from "chalk";
import uuid from "uuid/v4";
import { Injectable } from "@nestjs/common";
import { IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { CompileService, ICommonBuildConfigs, TaskType, ISourceCreateResult } from "#global/services/compile.service";
import { ClusterWorker } from "#global/services/worker.service";
import { BuilderFactory } from "#core/index";

export enum CompileTaskStatus {
  Pending,
  Running,
  Failed,
  Done,
}

export interface ICompileTask {
  id: string;
  name: string;
  type: TaskType;
  status: CompileTaskStatus;
  configs: IPageCreateOptions;
  creator: number;
  operator: number;
  errorMsg?: string;
}

export interface IWebsitePageHash {
  [name: string]: {
    latest: string;
    files: {
      [key: string]: string;
    };
  };
}

export interface ICompileStorage {
  [name: string]: ICompileTask;
}

const ASSETS_DIR = path.resolve(__dirname, "..", "..", "assets");
const INTERVAL = 3000;
const RANDOM_DELAY = Math.floor(Math.random() * 3000);
const TASKID = "task::core-compile-work";
const STORAGEID = "storage::core-compile-work";

@Injectable()
export class CoreCompiler implements CompileService<ICompileTask> {
  private _factory = new BuilderFactory();
  private _hash: IWebsitePageHash = {};
  // private _mapCache!: IGlobalMap;

  private get builder() {
    return this._factory.builder;
  }

  constructor(protected worker: ClusterWorker) {
    worker.ACTIVE.subscribe(active => {
      if (active) {
        // console.log("start set interval " + INTERVAL);
        worker
          .registerTask(TASKID, {
            storage: STORAGEID,
            data: <ICompileStorage>{},
            autoReset: true,
          })
          .then(async () => {
            await worker.runTask(TASKID);
            this.autoWatch(INTERVAL);
          })
          .catch(() => this.autoWatch(INTERVAL));
      }
    });
  }

  // public getTemplateGroup(): IGlobalMap {
  //   return this._mapCache || (this._mapCache = cloneDeep(this._factory.builder.get(GlobalMap).maps));
  // }

  public getTemplateGroup(): any {
    return {};
  }

  public queryPageUri(name: string) {
    const hash = this._hash[name];
    return !hash ? null : `website/${name}.${hash.latest}.html`;
  }

  public createTask(type: TaskType.PreviewEnvironBuild, configs: {}): Promise<string>;
  public createTask(type: TaskType.CommonPageBuild, configs: ICommonBuildConfigs): Promise<string>;
  public async createTask(type: any, configs: any): Promise<string> {
    if (type === TaskType.CommonPageBuild) {
      const { name, options } = configs;
      const task: ICompileTask = {
        id: createTaskID(),
        name,
        type,
        status: CompileTaskStatus.Pending,
        configs: options,
        creator: this.worker.id,
        operator: -1,
      };
      await this.worker.updateTask(TASKID, { insert: [[task.id, task]] });
      return task.id;
    }
    if (type === TaskType.PreviewEnvironBuild) {
      throw new Error("not implemented.");
    }
    throw new Error("no type is selected for core-compiler");
  }

  public async queryTask(id: string): Promise<ICompileTask | null> {
    const snapshot = await this.worker.queryTaskStatus<ICompileStorage>(TASKID);
    const currentList = snapshot.storage || {};
    const target = currentList[id];
    if (!target) {
      return null;
    }
    return target;
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

  protected async findAndStartTask() {
    const worker = this.worker;
    try {
      const snapshot = await worker.queryTaskStatus<ICompileStorage>(TASKID);
      // console.log("current snapshot operator --> " + snapshot.operator);
      // console.log("current query worker --> " + worker.id);
      // 非当前worker操作的任务，退出
      if (snapshot.operator !== worker.id) {
        return;
      }
      // console.log(Object.keys(snapshot.storage).map(l => snapshot.storage[l].status));
      const currentList = Object.keys(snapshot.storage || {}).map(k => snapshot.storage[k]);
      const runningTask = currentList.find(i => i.status === CompileTaskStatus.Running);
      if (runningTask) {
        // 上一轮执行节点已经离线，需要重置任务状态
        if (runningTask.operator !== worker.id) {
          runningTask.status = CompileTaskStatus.Pending;
          runningTask.operator = worker.id;
          await worker.updateTask(TASKID, { update: [[runningTask.id, runningTask]] });
        }
        return;
      }
      const firstPending = currentList.findIndex(i => i.status === CompileTaskStatus.Pending);
      // 没有任务需要运行，退出
      if (firstPending < 0) {
        return;
      }
      const task = currentList[firstPending];
      task.status = CompileTaskStatus.Running;
      task.operator = worker.id;
      await worker.updateTask(TASKID, { update: [[task.id, task]] });
      await this.runCustomTask(task);
      await worker.updateTask(TASKID, { update: [[task.id, task]] });
      await worker.finishTask(TASKID);
    } catch (error) {
      console.log(error);
    }
  }

  private async runCustomTask(task: ICompileTask) {
    if (task.type === TaskType.CommonPageBuild) {
      const tempSrcDir = getSrcDir(task.id);
      const tempBuildDir = getBuildDir(task.id);
      const exist = await fs.pathExists(tempSrcDir);
      if (!exist) {
        fs.mkdirSync(tempSrcDir, { recursive: true });
      }
      await this.runCommonBuildWorkAsync(task, tempSrcDir, tempBuildDir);
    } else {
      throw new Error("other task types are not implemented.");
    }
  }

  protected async runCommonBuildWorkAsync(task: ICompileTask, srcDir: string, buildDir: string) {
    const stamp = new Date().getTime();
    const filehash = (this._hash[task.name] = this._hash[task.name] || { latest: "", files: {} });
    try {
      const targetFile = path.join(srcDir, "main.tsx");
      console.log(chalk.blue(`[COMPILE-TASK] task[${task.id}] is now running.`));
      const { sourceCode, dependencies } = await this.builder.createSource({
        configs: task.configs,
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
          if (filehash.files[match as string] === value) {
            return true;
          }
          filehash.files[match as string] = value;
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
        filehash.latest = task.id;
        await this.moveHtmlBundle(task.name, task.id, buildDir);
      }
      task.status = CompileTaskStatus.Done;

      console.log(JSON.stringify(filehash, null, "  "));

      const cost = this.getSecondsCost(stamp);
      console.log(chalk.green(`[COMPILE-TASK] task[${task.id}] end with status [${task.status}] in ${cost}s`));
    } catch (error) {
      console.log(error);
      try {
        if (error && error.message) {
          task.errorMsg = String(error.message);
        } else {
          task.errorMsg = JSON.stringify(error);
        }
      } catch (error02) {
        task.errorMsg = String(error02);
      }
      task.status = CompileTaskStatus.Failed;

      const cost = this.getSecondsCost(stamp);
      console.log(chalk.red(`[COMPILE-TASK] task[${task.id}] end with status [${task.status}]  in ${cost}s`));
      console.log(chalk.yellow(`[COMPILE-TASK] task[${task.id}] failed.`));
    }
  }

  protected delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  protected async autoWatch(time: number) {
    // 延迟随机数，均衡事件轮询的分布
    await this.delay(RANDOM_DELAY);
    setInterval(() => this.findAndStartTask(), time);
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

function createTaskID(): string {
  return new Date().getTime() + "-" + uuid().slice(0, 6);
}

function getNpmSandbox() {
  return path.resolve(__dirname, "..", "..", "temp");
}

function getTsconfigFile() {
  return path.resolve(__dirname, "..", "..", "tsconfig.jsx.json");
}

function getSrcDir(id: string) {
  return path.resolve(getNpmSandbox(), id, "src");
}

function getBuildDir(id: string) {
  return path.resolve(getNpmSandbox(), id, "build");
}
