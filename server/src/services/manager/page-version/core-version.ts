import { Injectable } from "@nestjs/common";
import { IWebsitePageHash, PageVersionService } from "./contract";
import { Subject } from "rxjs";

@Injectable()
export class CorePageVersionManager extends PageVersionService {
  public getPage(pageName: string) {
    return this.pageCache[pageName];
  }

  public updatePage(pageName: string, updates: Partial<IWebsitePageHash>) {
    const page = this.pageCache[pageName];
    if (page) {
      this._updatePageCache(pageName, updates);
      return;
    }
    this._createNewCache(pageName, updates);
  }

  public subscribePage(pageName: string): Promise<string> {
    const obs = this.pageObserver[pageName];
    if (!obs) {
      throw new Error(`no page [${pageName}] observer exist.`);
    }
    return new Promise(resolve => {
      const subp = obs.observer.subscribe(resolve);
      obs.subscriptions.push(subp);
    });
  }

  private _updatePageCache(pageName: string, updates: Partial<IWebsitePageHash>) {
    const page = this.pageCache[pageName];
    page.files = updates.files ?? page.files;
    page.metadata = updates.metadata ?? page.metadata;
    page.config = updates.config ?? page.config;
    page.status = updates.status ?? page.status;
    page.latest = updates.latest ?? page.latest;
    if (updates.status === "loaded") {
      const obs = this.pageObserver[pageName];
      (obs.observer as Subject<string>).next(page.latest);
      setTimeout(() => {
        obs.subscriptions.forEach(e => !e.closed && e.unsubscribe());
        obs.subscriptions = [];
      });
      return;
    }
  }

  private _createNewCache(pageName: string, updates: Partial<IWebsitePageHash>) {
    this.pageCache[pageName] = {
      status: "default",
      metadata: "{}",
      files: updates.files ?? {},
      config: "{}",
      latest: updates.latest!,
    };
    this.pageObserver[pageName] = {
      observer: new Subject<string>(),
      subscriptions: [],
    };
  }
}
