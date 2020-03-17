import { Injectable } from "@nestjs/common";
import { createConnection } from "typeorm";
import { BehaviorSubject } from "rxjs";
import {
  TaskWorker,
  ITaskStartOptions,
  TaskStatus,
  ITaskListQueryOptions,
  ITaskEndOptions,
  IPageListQueryOptions,
  IVersionListQueryOptions,
  ITaskQueryOptions,
  IPageQueryOptions,
  IPageCreateUpdateOptions,
  IVersionCreateUpdateOptions,
  IVersionQueryOptions,
} from "#global/services/worker.service";
import { ConfigService } from "#global/services/config.service";
import { createOrmOptions } from "../ormconfig";
import { CompileTask } from "../entity/compile-task.entity";
import { Page } from "../entity/page.entity";
import { PageVersion } from "../entity/page-version.entity";
import { BaseMysqlService } from "./base.service";
import { PageService } from "./page.service";
import { VersionService } from "./ver.service";
import { TaskService } from "./task.service";

@Injectable()
export class MysqlWorker extends BaseMysqlService implements TaskWorker {
  public get id() {
    return process.pid;
  }

  private PAGE = new PageService();
  private VERSION = new VersionService();
  private TASK = new TaskService();

  public readonly active = new BehaviorSubject(false);

  constructor(private configs: ConfigService) {
    super();
    this.configs.onConfigLoad.subscribe(loaded => {
      if (loaded) this.initWorker();
    });
  }

  private async initWorker() {
    const configs = this.configs.getConfig();
    const mysql = configs.mysql;
    this.connection = await createConnection(
      createOrmOptions(mysql.user, mysql.password, mysql.database, mysql.host, mysql.port, mysql.synchronize),
    );
    this.TASK.setConnection(this.connection);
    this.PAGE.setConnection(this.connection);
    this.VERSION.setConnection(this.connection);
    this.active.next(true);
  }

  public async queryPageList(options: IPageListQueryOptions) {
    return this.PAGE.queryPageList(options);
  }

  public async queryTaskList(options: ITaskListQueryOptions) {
    return this.TASK.queryTaskList(options);
  }

  public async queryVersionList(options: IVersionListQueryOptions) {
    return this.VERSION.queryVersionList(options);
  }

  public async queryPage(options: IPageQueryOptions) {
    return this.PAGE.queryPage(options);
  }

  public async queryVersion(options: IVersionQueryOptions): Promise<PageVersion> {
    return this.VERSION.queryVersion(options);
  }

  public async queryTask(options: ITaskQueryOptions) {
    return this.TASK.queryTask(options);
  }

  public async createUpdatePage(options: IPageCreateUpdateOptions): Promise<any> {
    const { id, name, displayName, versionId, operator } = options;
    if (id !== void 0) {
      return this.PAGE.updatePage({ id, name, displayName, versionId }, ["id"]);
    } else {
      return this.PAGE.createPage({ name, displayName, creator: operator });
    }
  }

  public async createUpdateVersion(options: IVersionCreateUpdateOptions): Promise<any> {
    const { id, pageId, dist, data, operator } = options;
    if (id !== void 0) {
      return this.VERSION.updateVersion({ id, pageId, dist, data }, ["id"]);
    } else {
      return this.VERSION.createVersion({ pageId, data, creator: operator });
    }
  }

  // FOR DEV
  public async startTask(options: ITaskStartOptions): Promise<string> {
    let taskid: string = void 0;
    // 启动事务
    try {
      await this.connection.transaction(async manager => {
        const TASKS = manager.getRepository(CompileTask);
        const PAGES = manager.getRepository(Page);
        const VERSIONS = manager.getRepository(PageVersion);
        const { name, displayName, operator } = options;
        let page = await this.PAGE.queryPage({ name }, PAGES);
        if (!page) {
          const insertId = await this.PAGE.createPage({ name, displayName, creator: operator }, PAGES);
          page = await this.PAGE.queryPage({ id: insertId }, PAGES);
        }
        const verId = await this.VERSION.createVersion(
          {
            pageId: page.id,
            creator: operator,
            name: "AutoCreate_" + new Date().getTime(),
            data: JSON.stringify(options.data || {}),
          },
          VERSIONS,
        );
        taskid = await this.TASK.createTask(
          {
            pageId: page.id,
            status: TaskStatus.Pending,
            creator: operator,
            name: "AutoCreate_" + new Date().getTime(),
            versionId: verId,
          },
          TASKS,
        );
      });
    } catch (error) {
      throw new Error("Start Task Failed: " + error.message);
    }
    return String(taskid);
  }

  public async endTask(options: ITaskEndOptions): Promise<boolean> {
    return await this.TASK.updateTask(
      {
        id: options.id,
        creator: options.operator,
        status: options.status ?? TaskStatus.Done,
      },
      ["id", "creator"],
    );
  }
}
