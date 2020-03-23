import { Injectable } from "@nestjs/common";
import { BaseMysqlService } from "./base";
import { PageConfig } from "../entity/page-config.entity";
import { DistStorage } from "#database/entity/dist-storage.entity";
import { ReadStream } from "fs-extra";

export interface IQueryOptions {
  id: string | number;
}

export interface ICreateOptions {
  data: any;
}

@Injectable()
export class DistStorageRepo extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(DistStorage);
  }

  public async queryStream(options: IQueryOptions): Promise<ReadStream> {
    const queries: Partial<PageConfig> = {};
    if (options.id !== void 0) queries.id = options.id;
    return await this.connection.manager.queryRunner.stream(`SELECT data FROM ews_dist_storage(${+queries.id})`);
  }

  public async create(options: ICreateOptions, repo = this.repository): Promise<string | number> {
    return this.createEntry(repo, options);
  }
}
