import { Injectable } from "@nestjs/common";
import { Readable, Transform } from "stream";
import { DistStorage } from "#database/entity/dist-storage.entity";
import { BaseMysqlService } from "./base";

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

  public async queryStream(options: IQueryOptions, repo = this.repository): Promise<Readable> {
    return (
      await repo
        .createQueryBuilder("entry")
        .where(`entry.versionId = :id`, { id: options.versionId })
        .select("data")
        .stream()
    ).pipe(
      new Transform({
        readableObjectMode: true,
        writableObjectMode: true,
        transform(this: Transform, chunk: any, encoding: string, callback: Function) {
          callback(null, chunk.data.toString());
        },
      }),
    );
  }

  public async create(options: ICreateOptions, repo = this.repository): Promise<string | number> {
    return this.createEntry(repo, options);
  }
}
