import pickFn from "lodash/pick";
import omitFn from "lodash/omit";
import { Injectable } from "@nestjs/common";
import { Connection, Repository, SelectQueryBuilder } from "typeorm";
import { IListQueryResult } from "#global/services/worker.service";

@Injectable()
export class BaseMysqlService {
  protected connection!: Connection;

  public setConnection(connection: Connection) {
    this.connection = connection;
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
    for (const [key, entry] of entries) {
      builder = builder[useWhere](`${key} = :${key}`, { [key]: entry });
      useWhere = "andWhere";
    }
    return (!more ? builder : more(builder)).skip(+current * +size).take(+size);
  }

  protected createWhereBuilder<M>(repo: Repository<M>, where: Partial<M>) {
    let builder = repo.createQueryBuilder();
    const wheres = Object.entries(where);
    let fn: "where" | "andWhere" = "where";
    for (const [k, v] of wheres) {
      builder = builder[fn](`${k} = :${k}`, { [k]: v });
      fn = "andWhere";
    }
    return builder;
  }

  protected async invokeListQuery<M>(
    repo: Repository<M>,
    { current = 1, size = 20, ...where }: Record<string, any> & { current: number; size: number },
  ): Promise<IListQueryResult<M>> {
    const [list, count] = await this.createListQueryBuilder(repo, current, size, where).getManyAndCount();
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
    let builder = this.createWhereBuilder(repo, where).update();
    const entries = Object.entries(updates);
    for (const [k, v] of entries) {
      if (v !== void 0) builder = builder.update(<any>{ [k]: v });
    }
    const res = await builder.execute();
    if (res.affected <= 0) {
      throw new Error("Update Entry Failed: affected is 0");
    }
    return res.affected > 0;
  }

  protected async createEntry<M>(repo: Repository<M>, updates: Partial<M>): Promise<string> {
    const res = await repo.insert(<any>{ ...updates });
    return String(res.identifiers[0].id);
  }

  protected useSkipOmit<O extends Record<string, any>>(options: O, where: (keyof O)[]): [Partial<O>, Partial<O>] {
    return [pickFn(options, where), <any>omitFn(options, where)];
  }
}
