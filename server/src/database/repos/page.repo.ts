import { Injectable } from "@nestjs/common";
import { IListQueryResult, PageStatus } from "#typings/page";
import { BaseMysqlService, IBaseListQueryOptions } from "./base";
import { Page } from "../entity/page.entity";

export interface IListQueryOptions extends IBaseListQueryOptions {
  name?: string;
  creator?: string;
  current: number;
  size: number;
}

export interface IQueryOptions {
  id?: number | string;
  name?: string;
}

export interface ICreateOptions {
  name: string;
  status: PageStatus;
  displayName?: string;
  description?: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  updatedAt: Date;
  versionId?: string | number;
  configId?: string | number;
}

@Injectable()
export class PageRepo extends BaseMysqlService {
  protected _cacheKey = "page";

  protected get repository() {
    return this.connection.getRepository(Page);
  }

  public async queryList(options: IListQueryOptions, repo = this.repository): Promise<IListQueryResult<Page>> {
    return this.invokeListQuery(repo, options);
  }

  public async querySelectList(
    options: IListQueryOptions,
    select: (keyof Page)[],
    repo = this.repository,
  ): Promise<IListQueryResult<Page>> {
    return this.invokeListQuery(repo, options, select);
  }

  public async query(options: IQueryOptions, repo = this.repository): Promise<Page> {
    const queries: Partial<Page> = {};
    if (options.id !== void 0) queries.id = options.id;
    if (options.name !== void 0) queries.name = options.name;
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
