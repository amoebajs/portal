import { Injectable, Scope } from "@nestjs/common";
import { PageManageService, IWebsitePageHash } from "#global/services/page.service";

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
      page.latest = updates.latest!;
    } else {
      this.pageCache[pageName] = {
        files: updates.files || {},
        config: "{}",
        latest: updates.latest!,
      };
    }
  }
}
