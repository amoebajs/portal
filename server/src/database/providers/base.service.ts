import pickFn from "lodash/pick";
import omitFn from "lodash/omit";
import { Connection, Repository, SelectQueryBuilder } from "typeorm";
import { IListQueryResult } from "../typings";

export class BaseMysqlService {
  protected _connection!: Connection;

  protected get connection() {
    if (!this._connection) {
      throw new Error("Invalid operation: mysql's connection is not ready");
    }
    return this._connection;
  }

  public setConnection(connection: Connection) {
    this._connection = connection;
  }

  protected createListQueryBuilder<M>(
    repo: Repository<M>,
    current: number | string,
    size: number | string,
    where: Record<string, any>,
    more?: (builder: SelectQueryBuilder<M>) => SelectQueryBuilder<M>,
  ) {
    let builder = repo.createQueryBuilder();
    const entries = Object.entries(where);
    let useWhere: "where" | "andWhere" = "where";
    for (const [k, v] of entries) {
      if (v === void 0) continue;
      builder = builder[useWhere](`${k} = :${k}`, { [k]: v });
      useWhere = "andWhere";
    }
    return (!more ? builder : more(builder)).skip((+current - 1) * +size).take(+size);
  }

  protected createWhereBuilder<M>(repo: Repository<M>, where: Partial<M>) {
    let builder = repo.createQueryBuilder();
    const wheres = Object.entries(where);
    let fn: "where" | "andWhere" = "where";
    for (const [k, v] of wheres) {
      if (v === void 0) continue;
      builder = builder[fn](`${k} = :${k}`, { [k]: v });
      fn = "andWhere";
    }
    return builder;
  }

  protected async invokeListQuery<M>(
    repo: Repository<M>,
    { current = 1, size = 20, ...where }: Record<string, any> & { current: number; size: number },
    select?: (keyof M)[],
  ): Promise<IListQueryResult<M>> {
    const [list, count] = await this.createListQueryBuilder(
      repo,
      current,
      size,
      where,
      select && (builder => builder.select(<any[]>select)),
    ).getManyAndCount();
    return {
      items: list,
      current: +current,
      size: +size,
      total: count,
    };
  }

  protected async queryEntry<M>(repo: Repository<M>, where: Partial<M>) {
    return this.createWhereBuilder(repo, where).getOne();
  }

  protected async updateEntry<M>(repo: Repository<M>, where: Partial<M>, updates: Partial<M>): Promise<boolean> {
    const res = await this.createWhereBuilder(repo, where)
      .update(
        Object.entries(updates)
          .filter(([_, v]) => v !== void 0)
          .reduce((p, c) => ({ ...p, [c[0]]: c[1] }), {}),
      )
      .execute();
    if (res?.raw?.changedRows <= 0) {
      throw new Error("Update Entry Failed: affected is 0");
    }
    return res?.raw?.changedRows > 0;
  }

  protected async createEntry<M>(repo: Repository<M>, updates: Partial<M>): Promise<string | number> {
    const res = await repo.insert(<any>{ ...updates });
    return res.identifiers[0].id;
  }

  protected useSkipOmit<O extends Record<string, any>>(options: O, where: (keyof O)[]): [Partial<O>, Partial<O>] {
    return [pickFn(options, where), <any>omitFn(options, where)];
  }
}
