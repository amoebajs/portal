import { Injectable } from "@nestjs/common";
import { createConnection, Connection, Repository, SelectQueryBuilder } from "typeorm";
import { BehaviorSubject } from "rxjs";
import {
  TaskWorker,
  ITaskStartOptions,
  TaskStatus,
  ITaskListQueryOptions,
  ITaskEndOptions,
  IPageListQueryOptions,
  IListQueryResult,
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

@Injectable()
export class MysqlWorker implements TaskWorker {
  public get id() {
    return process.pid;
  }

  protected get tasks() {
    return this.connection.getRepository(CompileTask);
  }

  protected get pages() {
    return this.connection.getRepository(Page);
  }

  protected get versions() {
    return this.connection.getRepository(PageVersion);
  }

  public readonly active = new BehaviorSubject(false);

  private connection!: Connection;

  constructor(private configs: ConfigService) {
    if (!this.active.getValue()) {
      this.configs.onConfigLoad.subscribe(loaded => {
        if (loaded) this.initWorker();
      });
    }
  }

  private async initWorker() {
    const configs = this.configs.getConfig();
    const mysql = configs.mysql;
    this.connection = await createConnection(
      createOrmOptions(mysql.user, mysql.password, mysql.database, mysql.host, mysql.port, mysql.synchronize),
    );
    this.active.next(true);
  }

  private async _queryDetail<M>(repo: Repository<M>, where: Partial<M>) {
    let builder = repo.createQueryBuilder();
    const wheres = Object.entries(where);
    let fn: "where" | "andWhere" = "where";
    for (const [k, v] of wheres) {
      builder = builder[fn](`${k} = :${k}`, { [k]: v });
      fn = "andWhere";
    }
    const all = await builder.getMany();
    if (all.length === 0) {
      return void 0;
    }
    return all[0];
  }

  private _createListQueryBuilder<M>(
    repo: Repository<M>,
    current: number | string,
    size: number | string,
    where: Record<string, any>,
    more?: (builder: SelectQueryBuilder<M>) => SelectQueryBuilder<M>,
  ) {
    let builder = repo.createQueryBuilder();
    const entries = Object.entries(where);
    let useWhere: "where" | "andWhere" = "where";
    for (const [key, entry] of entries) {
      builder = builder[useWhere](`${key} = :${key}`, { [key]: entry });
      useWhere = "andWhere";
    }
    return (!more ? builder : more(builder)).skip(+current * +size).take(+size);
  }

  public async queryPageList({
    name,
    creator,
    current = 1,
    size = 20,
  }: IPageListQueryOptions): Promise<IListQueryResult<Page>> {
    const [list, count] = await this._createListQueryBuilder(this.pages, current, size, {
      name,
      creator,
    }).getManyAndCount();
    return {
      items: list,
      current: +current,
      size: +size,
      total: count,
    };
  }

  public async queryTaskList({
    name,
    creator,
    current = 1,
    size = 20,
  }: ITaskListQueryOptions): Promise<IListQueryResult<CompileTask>> {
    let pageId!: number | string;
    if (name !== void 0) {
      const page = await this._queryDetail(this.pages, { name });
      if (page) {
        pageId = page.id;
      }
    }
    const [list, count] = await this._createListQueryBuilder(this.tasks, current, size, {
      pageId,
      creator,
    }).getManyAndCount();
    return {
      items: list,
      current: +current,
      size: +size,
      total: count,
    };
  }

  public async queryVersionList({
    name,
    creator,
    current = 1,
    size = 20,
  }: IVersionListQueryOptions): Promise<IListQueryResult<PageVersion>> {
    let pageId!: number | string;
    if (name !== void 0) {
      const page = await this._queryDetail(this.pages, { name });
      if (page) {
        pageId = page.id;
      }
    }
    const [list, count] = await this._createListQueryBuilder(this.versions, current, size, {
      pageId,
      creator,
    }).getManyAndCount();
    return {
      items: list,
      current: +current,
      size: +size,
      total: count,
    };
  }

  public async queryPage(options: IPageQueryOptions): Promise<Page> {
    const queries: Partial<Page> = {};
    if (options.id !== void 0) queries.id = options.id;
    if (options.name !== void 0) queries.name = options.name;
    const task = await this._queryDetail(this.pages, queries);
    if (!task) {
      return void 0;
    }
    return task;
  }

  public async createUpdatePage(options: IPageCreateUpdateOptions): Promise<string> {
    const { id, name, displayName, versionId, operator } = options;
    if (id !== void 0) {
      return this._updateEntry(this.pages, id, { name, displayName, versionId });
    } else {
      return this._createEntry(this.pages, { name, displayName: displayName || name, creator: operator });
    }
  }

  public async createUpdateVersion(options: IVersionCreateUpdateOptions): Promise<string> {
    const { id, pageId, dist, data, operator } = options;
    if (id !== void 0) {
      return this._updateEntry(this.versions, id, { pageId, dist, data });
    } else {
      return this._createEntry(this.versions, { id, pageId, dist, data, creator: operator });
    }
  }

  public async queryVersion(options: IVersionQueryOptions): Promise<PageVersion> {
    const result = await this.versions
      .createQueryBuilder()
      .where(`id = :id`, { id: options.id })
      .getMany();
    return result[0];
  }

  private async _updateEntry<T>(repo: Repository<T>, id: any, updates: Partial<T>): Promise<string> {
    let builder = repo
      .createQueryBuilder()
      .where(`id = :id`, { id })
      .update();
    const entries = Object.entries(updates);
    for (const [k, v] of entries) {
      if (v !== void 0) builder = builder.update(<any>{ [k]: v });
    }
    const res = await builder.execute();
    if (res.affected <= 0) {
      throw new Error("Update Entry Failed: affected is 0");
    }
    return String(id);
  }

  private async _createEntry<T>(repo: Repository<T>, updates: Partial<T>): Promise<string> {
    const res = await repo.insert(<any>{ ...updates });
    return String(res.identifiers[0].id);
  }

  public async startTask(options: ITaskStartOptions): Promise<string> {
    let taskid: string = void 0;
    // 启动事务
    try {
      await this.connection.transaction(async manager => {
        const tasks = manager.getRepository(CompileTask);
        const pages = manager.getRepository(Page);
        const versions = manager.getRepository(PageVersion);
        const { name, displayName, operator } = options;
        let page = await this._queryDetail(pages, { name });
        if (!page) {
          const insertId = await this._createEntry(pages, { name, displayName, creator: operator });
          page = await this._queryDetail(pages, { id: insertId });
        }
        const res1 = await versions.insert({
          pageId: String(page.id),
          creator: String(operator),
          data: JSON.stringify(options.data || {}),
        });
        const res2 = await tasks.insert({
          pageId: String(page.id),
          status: TaskStatus.Pending,
          creator: String(operator),
          versionId: String(res1.identifiers[0].id),
        });
        taskid = String(res2.identifiers[0].id);
      });
    } catch (error) {
      throw new Error("Start Task Failed: " + error.message);
    }
    return String(taskid);
  }

  public async queryTask(options: ITaskQueryOptions): Promise<CompileTask> {
    const task = await this._queryDetail(this.tasks, { id: options.id });
    if (!task) {
      return void 0;
    }
    return task;
  }

  public async endTask(options: ITaskEndOptions): Promise<boolean> {
    const result = await this.tasks
      .createQueryBuilder()
      .where(`id = :id`, { id: options.id })
      .andWhere(`creator = :creator`, { creator: options.operator })
      .update({ status: options.status ?? TaskStatus.Done })
      .execute();
    return result.affected > 0;
  }
}
