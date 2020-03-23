import { Injectable } from "@nestjs/common";
import { BaseMysqlService } from "./base";
import { CompileTask } from "../entity/compile-task.entity";
import { TaskStatus, IListQueryResult } from "../typings";

export interface IListQueryOptions {
  name?: string;
  pageId?: string;
  creator?: string;
  current: number;
  size: number;
}

export interface IQueryOptions {
  id: number | string;
}

export interface ICreateOptions {
  pageId: string | number;
  configId: string | number;
  versionId: string | number;
  status: TaskStatus;
  name: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  updatedAt: Date;
  logs?: string;
  creator?: string;
}

@Injectable()
export class CompileTaskRepo extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(CompileTask);
  }

  public async queryList(options: IListQueryOptions, repo = this.repository): Promise<IListQueryResult<CompileTask>> {
    return this.invokeListQuery(repo, options);
  }

  public async querySelectList(
    options: IListQueryOptions,
    select: (keyof CompileTask)[],
    repo = this.repository,
  ): Promise<IListQueryResult<CompileTask>> {
    return this.invokeListQuery(repo, options, select);
  }

  public async query(options: IQueryOptions, repo = this.repository): Promise<CompileTask> {
    const queries: Partial<CompileTask> = {};
    if (options.id !== void 0) queries.id = options.id;
    return this.queryEntry(repo, queries);
  }

  public async create(options: ICreateOptions, repo = this.repository): Promise<string | number> {
    return this.createEntry(repo, options);
  }

  public async update(
    options: IUpdateOptions,
    where: (keyof IUpdateOptions)[],
    repo = this.repository,
  ): Promise<boolean> {
    const [w, o] = this.useSkipOmit(options, where);
    return this.updateEntry(repo, w, { ...o, updatedAt: new Date() });
  }
}
