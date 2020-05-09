import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";
import { CompileTask } from "#database/entity/compile-task.entity";
import { Page } from "#database/entity/page.entity";
import { PageConfig } from "#database/entity/page-config.entity";
import { PageVersion } from "#database/entity/page-version.entity";
import { BaseMysqlService } from "#database/repos/base";
import { PageRepo } from "#database/repos/page.repo";
import { PageVersionRepo } from "#database/repos/page-version.repo";
import { CompileTaskRepo } from "#database/repos/compile-task.repo";
import { PageConfigRepo } from "#database/repos/page-config.repo";
import { IListQueryResult, PageStatus, TaskStatus } from "#typings/page";
import { DbConnection } from "./connection";

export interface IPageCreateOptions {
  name?: string;
  configName?: string;
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
  configName?: string;
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

export interface ITaskUpdateOptions {
  id: number | string;
  operator: string;
  logs?: string;
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
  VERSION: import("#database/repos/page-version.repo").IListQueryOptions;
  CONFIG: import("#database/repos/page-config.repo").IListQueryOptions;
  TASK: import("#database/repos/compile-task.repo").IListQueryOptions;
  PAGE: import("#database/repos/page.repo").IListQueryOptions;
}

interface IQueryOptions {
  VERSION: import("#database/repos/page-version.repo").IQueryOptions;
  CONFIG: import("#database/repos/page-config.repo").IQueryOptions;
  TASK: import("#database/repos/compile-task.repo").IQueryOptions;
  PAGE: import("#database/repos/page.repo").IQueryOptions;
}

const ProviderMap = {
  PAGE: "$pages",
  CONFIG: "$configs",
  VERSION: "$versions",
  TASK: "$tasks",
};

@Injectable()
export class MysqlWorker extends BaseMysqlService {
  public readonly active = new Subject<void>();

  constructor(
    private readonly $pages: PageRepo,
    private readonly $versions: PageVersionRepo,
    private readonly $configs: PageConfigRepo,
    private readonly $tasks: CompileTaskRepo,
    dbc: DbConnection,
  ) {
    super(dbc);
    dbc.connected.subscribe(() => this.active.next());
  }

  public async queryList<K extends keyof IListQueryOptions>(
    type: K,
    options: IListQueryOptions[K],
  ): Promise<IListQueryResult<IEntityType[K]>> {
    return (<any>this)[ProviderMap[type]].queryList(options);
  }

  public async querySelectList<K extends keyof IListQueryOptions>(
    type: K,
    options: IListQueryOptions[K],
    select: (keyof IEntityType[K])[],
  ): Promise<IListQueryResult<IEntityType[K]>> {
    return (<any>this)[ProviderMap[type]].querySelectList(options, select);
  }

  public async query<K extends keyof IQueryOptions>(type: K, options: IQueryOptions[K]): Promise<IEntityType[K]> {
    return (<any>this)[ProviderMap[type]].query(options);
  }

  public async createNewPage(name: string, display: string, desc: string, operator: string) {
    const duplicated = await this.$pages.query({ name });
    if (!!duplicated) {
      throw new Error("Page with same name is already exist");
    }
    const pageid = await this.$pages.create({
      name,
      displayName: display,
      description: desc,
      status: PageStatus.Changed,
      creator: operator,
    });
    return pageid;
  }

  public async updateExistPage(id: string, name: string, display: string, desc: string) {
    const exist = await this.$pages.query({ id });
    if (!exist) {
      throw new Error("Page with same name is not exist");
    }
    const success = await this.$pages.update(
      {
        id,
        name,
        displayName: display,
        description: desc,
        status: PageStatus.Changed,
        updatedAt: new Date(),
      },
      ["id"],
    );
    return success;
  }

  public async createConfig(pageId: string | number, name: string, data: Record<string, any>, operator: string) {
    const configid = await this.$configs.create({
      name,
      pageId,
      data: JSON.stringify(data),
      creator: operator,
    });
    return configid;
  }

  public async createPage(options: IPageCreateOptions): Promise<number | string> {
    let pageId: string | number;
    await this.connection.transaction(async manager => {
      const { name, displayName, configName, description, operator, configs } = options;
      const $pages = manager.getRepository(Page);
      const $configs = manager.getRepository(PageConfig);
      const duplicated = await this.$pages.query({ name }, $pages);
      if (!!duplicated) {
        throw new Error("Page with same name is alread exist");
      }
      const pageid = await this.$pages.create(
        {
          name,
          displayName,
          description,
          status: PageStatus.Changed,
          creator: operator,
        },
        $pages,
      );
      const confname = configName ?? "AutoCreate_" + new Date().getTime();
      const confid = await this.$configs.create(
        {
          pageId: pageid,
          creator: operator,
          name: confname,
          data: JSON.stringify(configs ?? {}),
        },
        $configs,
      );
      await this.$pages.update(
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
      const page = await this.$pages.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      if (name !== void 0 && name !== page.name) {
        const duplicated = await this.$pages.query({ name }, $pages);
        if (!!duplicated) {
          throw new Error("Page with same name is alread exist");
        }
      }
      const success = await this.$pages.update(
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

  public async updatePageConfig(options: IPageConfigUpdateOptions): Promise<number | string> {
    const { id, operator, configName, config } = options;
    let configId!: number | string;
    await this.connection.transaction(async manager => {
      const $configs = manager.getRepository(PageConfig);
      const $pages = manager.getRepository(Page);
      const page = await this.$pages.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      configId = page.configId;
      if (page.status === PageStatus.Normal) {
        const preconf = await this.$configs.query({ id: page.configId });
        const newdata = JSON.stringify(config ?? {});
        if (preconf.data === newdata) {
          // no changes found
          return;
        }
        const confname = configName ?? "AutoCreate_" + new Date().getTime();
        const newconfid = await this.$configs.create(
          {
            pageId: page.id,
            data: newdata,
            name: confname,
            creator: operator,
          },
          $configs,
        );
        const pageSuccess = await this.$pages.update(
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
        configId = newconfid;
      } else {
        const confSuccess = await this.$configs.update(
          {
            id: page.configId,
            data: JSON.stringify(config ?? {}),
            name: configName,
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
    return configId;
  }

  public async updatePageVersion(options: IPageVersionUpdateOptions): Promise<boolean> {
    const { id, versionId } = options;
    await this.connection.transaction(async manager => {
      const $versions = manager.getRepository(PageVersion);
      const $pages = manager.getRepository(Page);
      const page = await this.$pages.query({ id }, $pages);
      if (!page) {
        throw new Error("Page is not exist");
      }
      const version = await this.$versions.query({ id: versionId }, $versions);
      if (!version) {
        throw new Error("Page version is not exist");
      }
      let status = page.status;
      if (version.configId !== page.configId) {
        status = PageStatus.Changed;
      }
      const success = await this.$pages.update(
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
      const $pages = manager.getRepository(Page);
      const page = await this.$pages.query({ id: pageId, name: pageName }, $pages);
      const taskname = versionName ?? "AutoCreate_" + new Date().getTime();
      const newverid = await this.$versions.create(
        {
          name: taskname,
          configId: page.configId,
          pageId: page.id,
          creator: operator,
          dist: "{}",
        },
        $versions,
      );
      const newtaskid = await this.$tasks.create(
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
      await this.$versions.update(
        {
          id: newverid,
          taskId: newtaskid,
          updatedAt: new Date(),
        },
        ["id"],
        $versions,
      );
      taskid = newtaskid;
    });
    return taskid;
  }

  public async startTask(options: ITaskStartOptions): Promise<boolean> {
    const { id, operator } = options;
    return this.$tasks.update(
      {
        id,
        creator: operator,
        status: TaskStatus.Running,
        updatedAt: new Date(),
      },
      ["id", "creator"],
    );
  }

  public async updateTask(options: ITaskUpdateOptions): Promise<boolean> {
    const { id, logs, operator } = options;
    return this.$tasks.update(
      {
        id,
        creator: operator,
        logs,
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
      const task = await this.$tasks.query({ id }, $tasks);
      const page = await this.$pages.query({ id: task.pageId }, $pages);
      const version = await this.$versions.query({ id: task.versionId }, $versions);
      const verSuccess = await this.$versions.update(
        {
          id: task.versionId,
          dist,
          metadata: JSON.stringify({
            name: page.name,
            displayName: page.displayName,
            description: page.description,
          }),
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
      const pageSuccess = await this.$pages.update(
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
      const taskSuccess = await this.$tasks.update(
        {
          id,
          creator: operator,
          status: status ?? TaskStatus.Done,
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
