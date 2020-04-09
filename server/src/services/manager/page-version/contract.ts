import { Injectable } from "@nestjs/common";
import { createToken } from "#utils/di";
import { Observable, Subscription } from "rxjs";

export interface IWebsitePageHash {
  latest: string | null;
  config: string;
  status: "loaded" | "loading" | "default";
  metadata: string;
  files: {
    [key: string]: string;
  };
}

export interface IWebsitePageObserver {
  observer: Observable<string>;
  subscriptions: Subscription[];
}

@Injectable()
export abstract class PageVersionService {
  protected readonly pageCache: Record<string, IWebsitePageHash> = {};
  protected readonly pageObserver: Record<string, IWebsitePageObserver> = {};
  public abstract getPage(pageName: string): IWebsitePageHash;
  public abstract updatePage(pageName: string, updates: Partial<IWebsitePageHash>): void;
  public abstract subscribePage(pageName: string): Promise<string>;
}

export type PageVersionManager = PageVersionService;
export const PageVersionManager = createToken<PageVersionManager>(PageVersionService);
