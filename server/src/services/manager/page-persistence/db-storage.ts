import { Injectable } from "@nestjs/common";
import { DistStorageRepo } from "#database/repos/dist-storage.repo";
import { PagePersistence } from "./contract";
import { DbConnection } from "#services/database/connection";

@Injectable()
export abstract class PagePersistenceDbStorage implements PagePersistence {
  constructor(dbc: DbConnection, private storage: DistStorageRepo) {
    dbc.connected.subscribe(connection => {
      this.storage.setConnection(connection);
    });
  }

  public async getFile(id: string | number): Promise<ReadableStream<any>> {
    const target = await this.storage.queryStream({ id });
    // return target.setEncoding("utf8").
    return null as any;
  }

  public async setFile(id: string | number, file: ReadableStream<any>): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
