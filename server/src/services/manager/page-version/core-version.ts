import { Injectable } from "@nestjs/common";
import { PageVersionService, IWebsitePageHash } from "./contract";

@Injectable()
export class CorePageVersionManager extends PageVersionService {
  public getPage(pageName: string) {
    return this.pageCache[pageName];
  }

  public updatePage(pageName: string, updates: Partial<IWebsitePageHash>) {
    const page = this.pageCache[pageName];
    if (page) {
      page.files = updates.files ?? page.files;
      page.metadata = updates.metadata ?? page.metadata;
      page.config = updates.config ?? page.config;
      page.status = updates.status ?? page.status;
      page.latest = updates.latest ?? page.latest;
    } else {
      this.pageCache[pageName] = {
        status: "default",
        metadata: "{}",
        files: updates.files ?? {},
        config: "{}",
        latest: updates.latest!,
      };
    }
  }
}
