import { Injectable } from "@nestjs/common";
import { createToken } from "#utils/di";

export interface IWebsitePageHash {
  latest: string | null;
  config: string;
  status: "loaded" | "loading" | "default";
  metadata: string;
  files: {
    [key: string]: string;
  };
}

@Injectable()
export abstract class PageVersionService<T = IWebsitePageHash> {
  protected readonly pageCache: Record<string, T> = {};
  public abstract getPage(pageName: string): T;
  public abstract updatePage(pageName: string, updates: Partial<T>): void;
}

export type PageVersionManager = PageVersionService<IWebsitePageHash>;
export const PageVersionManager = createToken<PageVersionManager>(PageVersionService);
