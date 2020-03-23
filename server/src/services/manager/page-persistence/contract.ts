import { Injectable } from "@nestjs/common";

@Injectable()
export abstract class PagePersistence {
  public abstract async getFile(id: string | number): Promise<ReadableStream>;
  public abstract async setFile(id: string | number, file: ReadableStream): Promise<void>;
}
