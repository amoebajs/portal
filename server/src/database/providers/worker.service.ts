import { Injectable } from "@nestjs/common";
import { createConnection } from "typeorm";
import { BehaviorSubject } from "rxjs";
import { ConfigService as Configs } from "#global/services/config.service";
import { createOrmOptions } from "../ormconfig";
import { CompileTask } from "../entity/compile-task.entity";
import { Page } from "../entity/page.entity";
import { PageConfig } from "../entity/page-config.entity";
import { PageVersion } from "../entity/page-version.entity";
import { BaseMysqlService } from "./base.service";
import { PageService } from "./page.service";
import { VersionService } from "./ver.service";
import { TaskService } from "./task.service";
import { ConfigService } from "./conf.service";
import { TaskStatus, PageStatus, IListQueryResult } from "../typings";

export interface IPageCreateOptions {
  name?: string;
  displayName?: string;
  description?: string;
  configs?: Record<string, any>;
  operator: string;
}

export interface IPageDetailsUpdateOptions {
  id: number | string;
  name?: string;
  displayName?: string;
  description?: string;
}

export interface IPageConfigUpdateOptions {
  id: number | string;
  config: Record<string, any>;
  operator: string;
}

export interface IPageVersionUpdateOptions {
  id: number | string;
  versionId: string;
}

export interface ITaskCreateOptions {
  pageId?: string | number;
  pageName?: string;
  versionName?: string;
  operator: string;
}

export interface ITaskStartOptions {
  id: number | string;
  operator: string;
}

export interface ITaskEndOptions {
  id: number | string;
  operator: string;
  status?: TaskStatus;
  dist: string;
}

export interface IConfigCreateUpdateOptions {
  id?: number | string;
  pageId?: string | number;
  operator?: string;
  data?: string;
}

interface IEntityType {
  VERSION: PageVersion;
  CONFIG: PageConfig;
  TASK: CompileTask;
  PAGE: Page;
}

interface IListQueryOptions {
  VERSION: import("./ver.service").IListQueryOptions;
  CONFIG: import("./conf.service").IListQueryOptions;
  TASK: import("./task.service").IListQueryOptions;
  PAGE: import("./page.service").IListQueryOptions;
}

interface IQueryOptions {
  VERSION: import("./ver.service").IQueryOptions;
  CONFIG: import("./conf.service").IQueryOptions;
  TASK: import("./task.service").IQueryOptions;
  PAGE: import("./page.service").IQueryOptions;
}

@Injectable()
export class MysqlWorker extends BaseMysqlService {
  public get id() {
    return process.pid;
  }

  private PAGE = new PageService();
  private VERSION = new VersionService();
  private TASK = new TaskService();
  private CONFIG = new ConfigService();

  public readonly active = new BehaviorSubject(false);

  constructor(private configs: Configs) {
    super();
    this.configs.onConfigLoad.subscribe(loaded => {
      if (loaded) this.initWorker();
    });
  }

  private async initWorker() {
    const configs = this.configs.getConfig();
    const mysql = configs.mysql;
    this.setConnection(
      await createConnection(
        createOrmOptions(mysql.user, mysql.password, mysql.database, mysql.host, mysql.port, mysql.synchronize),
      ),
    );
    this.TASK.setConnection(this.connection);
    this.PAGE.setConnection(this.connection);
    this.VERSION.setConnection(this.connection);
    this.CONFIG.setConnection(this.connection);
    this.active.next(true);
  }

  public async queryList<K extends keyof IListQueryOptions>(
    type: K,
    options: IListQueryOptions[K],
  ): Promise<IListQueryResult<IEntityType[K]>> {
    return (<any>this)[type].queryList(options);
  }

  public async query<K extends keyof IQueryOptions>(type: K, options: IQueryOptions[K]): Promise<IEntityType[K]> {
    return (<any>this)[type].query(options);
  }

  public async createPage(options: IPageCreateOptions): Promise<number | string> {
    let pageId: string | number;
    await this.connection.transaction(async manager => {
      const { name, displayName, description, operator, configs } = options;
      const $pages = manager.getRepository(Page);
      const $configs = manager.getRepository(PageConfig);
      const duplicated = await this.PAGE.query({ name }, $pages);
      if (!!duplicated) {
        throw new Error("Page with same name is alread exist");
      }
      const pageid = await this.PAGE.create(
        {
          name,
          displayName,
          description,
          status: PageStatus.Changed,
          creator: operator,
        },
        $pages,
      );
      const confid = await this.CONFIG.create(
        {
          pageId: pageid,
          creator: operator,
          data: JSON.stringify(configs || {}),
        },
        $configs,
      );
      await this.PAGE.update(
        {
          id: pageid,
          configId: confid,
          updatedAt: new Date(),
        },
        ["id"],
        $pages,
      );
      pageId = pageid;
    });
    return pageId;
  }

  public async updatePageDetails(options: IPageDetailsUpdateOptions): Promise<boolean> {
    const { id, name, displayName, description } = options;
    await this.connection.transaction(async manager => {
      const $pages = manager.getRepository(Page);
      const page = await this.PAGE.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      if (name !== void 0) {
        const duplicated = await this.PAGE.query({ name }, $pages);
        if (!!duplicated) {
          throw new Error("Page with same name is alread exist");
        }
      }
      const success = await this.PAGE.update(
        {
          id: page.id,
          name: name,
          displayName,
          description,
          updatedAt: new Date(),
        },
        ["id"],
        $pages,
      );
      if (!success) {
        throw new Error("Page update failed");
      }
    });
    return true;
  }

  public async updatePageConfig(options: IPageConfigUpdateOptions): Promise<boolean> {
    const { id, operator, config } = options;
    await this.connection.transaction(async manager => {
      const $configs = manager.getRepository(PageConfig);
      const $pages = manager.getRepository(Page);
      const page = await this.PAGE.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      if (page.status === PageStatus.Normal) {
        const newconfid = await this.CONFIG.create(
          {
            pageId: page.id,
            data: JSON.stringify(config || {}),
            creator: operator,
          },
          $configs,
        );
        const pageSuccess = await this.PAGE.update(
          {
            id: page.id,
            status: PageStatus.Changed,
            configId: newconfid,
            updatedAt: new Date(),
          },
          ["id"],
          $pages,
        );
        if (!pageSuccess) {
          throw new Error("Page update failed");
        }
      } else {
        const confSuccess = await this.CONFIG.update(
          {
            id: page.configId,
            data: JSON.stringify(config || {}),
            updatedAt: new Date(),
          },
          ["id"],
          $configs,
        );
        if (!confSuccess) {
          throw new Error("Page config update failed");
        }
      }
    });
    return true;
  }

  public async updatePageVersion(options: IPageVersionUpdateOptions): Promise<boolean> {
    const { id, versionId } = options;
    await this.connection.transaction(async manager => {
      const $versions = manager.getRepository(PageVersion);
      const $pages = manager.getRepository(Page);
      const page = await this.PAGE.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      const version = await this.VERSION.query({ id: versionId }, $versions);
      if (!version) {
        throw new Error("Page version is not exist");
      }
      let status = page.status;
      if (version.configId !== page.configId) {
        status = PageStatus.Changed;
      }
      const success = await this.PAGE.update(
        {
          id,
          versionId,
          status,
          updatedAt: new Date(),
        },
        ["id"],
        $pages,
      );
      if (!success) {
        throw new Error("Page update failed");
      }
    });
    return true;
  }

  public async createTask(options: ITaskCreateOptions) {
    const { pageId, pageName, versionName, operator } = options;
    let taskid: number | string;
    await this.connection.transaction(async manager => {
      const $versions = manager.getRepository(PageVersion);
      const $tasks = manager.getRepository(CompileTask);
      const page = await this.PAGE.query({ id: pageId, name: pageName });
      const taskname = versionName || "AutoCreate_" + new Date().getTime();
      const newverid = await this.VERSION.create(
        {
          name: taskname,
          configId: page.configId,
          creator: operator,
          dist: "{}",
        },
        $versions,
      );
      const newtaskid = await this.TASK.create(
        {
          name: taskname,
          pageId: page.id,
          configId: page.configId,
          versionId: newverid,
          creator: operator,
          status: TaskStatus.Pending,
        },
        $tasks,
      );
      taskid = newtaskid;
    });
    return taskid;
  }

  public async startTask(options: ITaskStartOptions): Promise<boolean> {
    const { id, operator } = options;
    return this.TASK.update(
      {
        id,
        creator: operator,
        status: TaskStatus.Running,
        updatedAt: new Date(),
      },
      ["id", "creator"],
    );
  }

  public async endTask(options: ITaskEndOptions) {
    const { id, status, dist, operator } = options;
    await this.connection.transaction(async manager => {
      const $versions = manager.getRepository(PageVersion);
      const $pages = manager.getRepository(Page);
      const $tasks = manager.getRepository(CompileTask);
      const task = await this.TASK.query({ id }, $tasks);
      const page = await this.PAGE.query({ id: task.pageId }, $pages);
      const version = await this.VERSION.query({ id: task.versionId }, $versions);
      const verSuccess = await this.VERSION.update(
        {
          id: task.versionId,
          dist,
          updatedAt: new Date(),
        },
        ["id"],
        $versions,
      );
      if (!verSuccess) {
        throw new Error("Page version update failed");
      }
      // 暂时这么处理，任务执行完毕，自动更新成当前页面的最新版本
      // 后续考虑拆解这个步骤，可以实现版本控制
      const pageSuccess = await this.PAGE.update(
        {
          id: task.pageId,
          versionId: task.versionId,
          // 如果页面config和版本config不一致：页面存在修改
          status: page.configId === version.configId ? PageStatus.Normal : PageStatus.Changed,
          updatedAt: new Date(),
        },
        ["id"],
        $pages,
      );
      if (!pageSuccess) {
        throw new Error("Page update failed");
      }
      const taskSuccess = await this.TASK.update(
        {
          id,
          creator: operator,
          status: status || TaskStatus.Done,
          updatedAt: new Date(),
        },
        ["id", "creator"],
        $tasks,
      );
      if (!taskSuccess) {
        throw new Error("Task update failed");
      }
    });
    return true;
  }
}
