import pickFn from "lodash/pick";
import omitFn from "lodash/omit";
import { Connection, Repository, SelectQueryBuilder } from "typeorm";
import { IListQueryResult } from "#typings/page";
import { DbConnection } from "#services/database/connection";
import { Subject } from "rxjs";
import { Injectable } from "@nestjs/common";

export interface IBaseListQueryOptions {
  current: number;
  size: number;
  cacheKey?: string;
  orderKey?: string;
  orderBy?: "ASC" | "DESC";
}

@Injectable()
export class BaseMysqlService {
  protected _connection!: Connection;
  protected _connected = new Subject<void>();
  protected _cacheKey!: string;

  protected get connection() {
    if (!this._connection) {
      throw new Error("Invalid operation: mysql's connection is not ready");
    }
    return this._connection;
  }

  constructor(dbc: DbConnection) {
    dbc.connected.subscribe(connection => {
      this.setConnection(connection);
      this._connected.next();
    });
  }

  public setConnection(connection: Connection) {
    this._connection = connection;
  }

  protected createListQueryBuilder<M>(
    repo: Repository<M>,
    options: {
      current: number | string;
      size: number | string;
      where: Record<string, any>;
      orderKey: string;
      orderBy: "ASC" | "DESC";
      cacheKey?: string;
      more?: (builder: SelectQueryBuilder<M>) => SelectQueryBuilder<M>;
    },
  ) {
    const { current, size, where, orderKey, orderBy, cacheKey, more } = options;
    let builder = this.createWhereBuilder(repo, <any>where, "entry");
    if (cacheKey !== void 0) builder = builder.cache(cacheKey, 60000);
    return (!more ? builder : more(builder))
      .skip((+current - 1) * +size)
      .take(+size)
      .orderBy("entry." + orderKey, orderBy);
  }

  protected createWhereBuilder<M>(repo: Repository<M>, where: Partial<M>, alias?: string) {
    const prefix = (alias && `${alias}.`) ?? "";
    let builder = repo.createQueryBuilder(alias);
    const wheres = Object.entries(where);
    let fn: "where" | "andWhere" = "where";
    for (const [k, v] of wheres) {
      if (v === void 0) continue;
      builder = builder[fn](prefix + `${k} = :${k}`, { [k]: v });
      fn = "andWhere";
    }
    return builder;
  }

  protected async invokeListQuery<M>(
    repo: Repository<M>,
    {
      current = 1,
      size = 20,
      orderKey = "createdAt",
      orderBy = "ASC",
      cacheKey = this._cacheKey + "_list",
      ...where
    }: Record<string, any> & IBaseListQueryOptions,
    select?: (keyof M)[],
  ): Promise<IListQueryResult<M>> {
    const [list, count] = await this.createListQueryBuilder(repo, {
      current,
      size,
      where,
      orderBy,
      orderKey,
      cacheKey,
      more: select && (builder => builder.select(<any[]>select.map(i => "entry." + i))),
    }).getManyAndCount();
    return {
      items: list,
      current: +current,
      size: +size,
      total: count,
    };
  }

  protected async queryEntry<M>(repo: Repository<M>, where: Partial<M>) {
    let builder = this.createWhereBuilder(repo, where, "entry");
    if (this._cacheKey !== void 0) builder = builder.cache(this._cacheKey + "_entity", 60000);
    return builder.getOne();
  }

  protected async updateEntry<M>(repo: Repository<M>, where: Partial<M>, updates: Partial<M>): Promise<boolean> {
    const res = await this.createWhereBuilder(repo, where)
      .update(
        Object.entries(updates)
          .filter(([_, v]) => v !== void 0)
          .reduce((p, c) => ({ ...p, [c[0]]: c[1] }), {}),
      )
      .execute();
    const success = res?.raw?.affectedRows > 0;
    if (success && this._cacheKey !== void 0) {
      await this.connection.queryResultCache.remove([this._cacheKey]);
    }
    return success;
  }

  protected async createEntry<M>(repo: Repository<M>, updates: Partial<M>): Promise<string | number> {
    const res = await repo.insert(<any>{ ...updates });
    if (this._cacheKey !== void 0) {
      await this.connection.queryResultCache.remove([this._cacheKey]);
    }
    return res.identifiers[0].id;
  }

  protected useSkipOmit<O extends Record<string, any>>(options: O, where: (keyof O)[]): [Partial<O>, Partial<O>] {
    return [pickFn(options, where), <any>omitFn(options, where)];
  }
}
