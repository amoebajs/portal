import { Injectable } from "@nestjs/common";
import { ReadStream } from "fs-extra";

@Injectable()
export abstract class PagePersistenceManager {
  public abstract async getFile(id: string | number): Promise<ReadStream>;
  public abstract async setFile(id: string | number, filepath: string): Promise<void>;
}
