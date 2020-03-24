import { Injectable } from "@nestjs/common";
import { PageManageService, IWebsitePageHash } from "./contract";

@Injectable()
export class CorePageManager extends PageManageService {
  public getPage(pageName: string) {
    return this.pageCache[pageName];
  }

  public updatePage(pageName: string, updates: Partial<IWebsitePageHash>) {
    const page = this.pageCache[pageName];
    if (page) {
      page.files = updates.files || page.files;
      page.config = updates.config || page.config;
      page.status = updates.status || page.status;
      page.latest = updates.latest!;
    } else {
      this.pageCache[pageName] = {
        status: "default",
        files: updates.files || {},
        config: "{}",
        latest: updates.latest!,
      };
    }
  }
}
