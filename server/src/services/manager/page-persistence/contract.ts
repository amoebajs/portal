import { Injectable } from "@nestjs/common";
import { Readable } from "stream";

@Injectable()
export abstract class PagePersistenceManager {
  public abstract async getFile(id: string | number): Promise<Readable>;
  public abstract async setFile(id: string | number, filepath: string): Promise<void>;
}
