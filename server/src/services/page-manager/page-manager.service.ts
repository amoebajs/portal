import { Injectable } from "@nestjs/common";
import { PageManageService, IWebsitePageHash } from "#services/page-manager/page.service";

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
