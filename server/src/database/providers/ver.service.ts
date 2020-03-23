import { Injectable } from "@nestjs/common";
import { BaseMysqlService } from "./base.service";
import { PageVersion } from "../entity/page-version.entity";
import { IListQueryResult } from "../typings";

export interface IListQueryOptions {
  name?: string;
  pageId?: string | number;
  creator?: string;
  current: number;
  size: number;
}

export interface IQueryOptions {
  id: string | number;
  name?: string;
}

export interface ICreateOptions {
  name?: string;
  configId: string | number;
  pageId: string | number;
  dist?: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  taskId?: string | number;
  updatedAt: Date;
}

@Injectable()
export class VersionService extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(PageVersion);
  }

  public async queryList(options: IListQueryOptions, repo = this.repository): Promise<IListQueryResult<PageVersion>> {
    return this.invokeListQuery(repo, options);
  }

  public async querySelectList(
    options: IListQueryOptions,
    select: (keyof PageVersion)[],
    repo = this.repository,
  ): Promise<IListQueryResult<PageVersion>> {
    return this.invokeListQuery(repo, options, select);
  }

  public async query(options: IQueryOptions, repo = this.repository): Promise<PageVersion> {
    const queries: Partial<PageVersion> = {};
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
