import * as fs from "fs-extra";
import { Injectable } from "@nestjs/common";
import { DistStorageRepo } from "#database/repos/dist-storage.repo";
import { PagePersistence } from "./contract";
import { DbConnection } from "#services/database/connection";
import { ReadStream } from "fs-extra";

@Injectable()
export class PagePersistenceDbStorage implements PagePersistence {
  constructor(dbc: DbConnection, private storage: DistStorageRepo) {
    dbc.connected.subscribe(connection => {
      this.storage.setConnection(connection);
    });
  }

  public async getFile(id: string | number): Promise<ReadStream> {
    return await this.storage.queryStream({ versionId: id });
  }

  public async setFile(id: string | number, filepath: string): Promise<void> {
    const filecontent = (await fs.readFile(filepath)).toString("utf8");
    await this.storage.create({ versionId: id, data: filecontent });
  }
}
