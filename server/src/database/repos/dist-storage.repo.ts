import { Injectable } from "@nestjs/common";
import { DistStorage } from "#database/entity/dist-storage.entity";
import { BaseMysqlService } from "./base";
import { ReadStream } from "fs-extra";

export interface IQueryOptions {
  versionId: string | number;
}

export interface ICreateOptions {
  versionId: string | number;
  data: any;
}

@Injectable()
export class DistStorageRepo extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(DistStorage);
  }

  public async queryStream(options: IQueryOptions, repo = this.repository): Promise<ReadStream> {
    let stream: ReadStream;
    await this.connection.transaction(async manager => {
      stream = await manager.queryRunner.stream(
        `select data from ews_dist_storage where version_id = ${options.versionId};`,
      );
    });
    return stream.setEncoding("utf8");
  }

  public async create(options: ICreateOptions, repo = this.repository): Promise<string | number> {
    return this.createEntry(repo, options);
  }
}
