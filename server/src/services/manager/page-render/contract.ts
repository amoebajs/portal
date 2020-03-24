import { Injectable } from "@nestjs/common";
import { createToken } from "#utils/di";

export interface IWebsitePageHash {
  latest: string | null;
  config: string;
  status: "loaded" | "loading" | "default";
  files: {
    [key: string]: string;
  };
}

@Injectable()
export abstract class PageManageService<T = IWebsitePageHash> {
  protected readonly pageCache: Record<string, T> = {};
  public abstract getPage(pageName: string): T;
  public abstract updatePage(pageName: string, updates: Partial<T>): void;
}

export type PageManager = PageManageService<IWebsitePageHash>;
export const PageManager = createToken<PageManager>(PageManageService);
