import { Injectable } from "@nestjs/common";
import { BaseMysqlService } from "./base";
import { IListQueryResult } from "../typings";
import { PageConfig } from "../entity/page-config.entity";

export interface IListQueryOptions {
  pageId?: number | string;
  creator?: string;
  current: number;
  size: number;
}

export interface IQueryOptions {
  id: string | number;
  pageId?: number | string;
}

export interface ICreateOptions {
  pageId?: string | number;
  data?: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  updatedAt: Date;
}

@Injectable()
export class PageConfigRepo extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(PageConfig);
  }

  public async queryList(options: IListQueryOptions, repo = this.repository): Promise<IListQueryResult<PageConfig>> {
    return this.invokeListQuery(repo, options);
  }

  public async querySelectList(
    options: IListQueryOptions,
    select: (keyof PageConfig)[],
    repo = this.repository,
  ): Promise<IListQueryResult<PageConfig>> {
    return this.invokeListQuery(repo, options, select);
  }

  public async query(options: IQueryOptions, repo = this.repository): Promise<PageConfig> {
    const queries: Partial<PageConfig> = {};
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
