import { Injectable } from "@nestjs/common";
import { IListQueryResult } from "#typings/base";
import { BaseMysqlService, IBaseListQueryOptions } from "./base";
import { User } from "../entity/user.entity";

export interface IListQueryOptions extends IBaseListQueryOptions {
  id?: number | string;
  key?: string;
  name?: string;
  account?: string;
}

export interface IQueryOptions {
  id?: number | string;
  key?: string;
  name?: string;
  account?: string;
}

export interface ICreateOptions {
  name: string;
  account: string;
  extends: string;
  key: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "id">> {
  id?: number | string;
  key?: string;
  updatedAt: Date;
}

@Injectable()
export class UserRepo extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(User);
  }

  public async queryList(options: IListQueryOptions, repo = this.repository): Promise<IListQueryResult<User>> {
    return this.invokeListQuery(repo, options);
  }

  public async querySelectList(
    options: IListQueryOptions,
    select: (keyof User)[],
    repo = this.repository,
  ): Promise<IListQueryResult<User>> {
    return this.invokeListQuery(repo, options, select);
  }

  public async query(options: IQueryOptions, repo = this.repository): Promise<User> {
    const queries: Partial<User> = {};
    if (options.id !== void 0) queries.id = options.id;
    if (options.key !== void 0) queries.key = options.key;
    if (options.name !== void 0) queries.name = options.name;
    if (options.account !== void 0) queries.account = options.account;
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
