import { Injectable } from "@angular/core";
import { HttpService } from "../../../services/http.service";
import { UseRouter } from "../router";

export interface IMenuItem {
  name: string;
  link: string;
  selected: boolean;
}

export interface IMenuGroup {
  name: string;
  icon: string;
  selected: boolean;
  items: IMenuItem[];
}

export interface IPreviewApiResult {
  code: number;
  data: {
    source: string;
    dependencies: Record<string, string>;
  };
}

@Injectable()
export class PortalService {
  public isCollapsed = false;

  public menulist: IMenuGroup[] = [
    {
      name: "配置化面板",
      icon: "user",
      selected: false,
      items: Object.entries(UseRouter.data)
        .filter(i => !["page", "edit"].includes(i[0]))
        .map(i => ({
          name: i[1].data.title,
          link: "/portal" + (i[1].path === "" ? "" : "/" + i[1].path),
          selected: false,
        })),
    },
  ];

  public userInfos: any = { logined: false, name: "" };

  constructor(private readonly http: HttpService) {
    this.fetchUserInfos();
  }

  public fetchPageList(current: number, size: number) {
    return this.http.get<any[]>("pages", { current, size });
  }

  public createPage(name: string, displayName?: string, desc?: string) {
    return this.http.post<string>("page", { name, displayName, description: desc });
  }

  public updatePage(id: string | number, name: string, displayName?: string, desc?: string) {
    return this.http.put<string>(`page/${id}`, { name, displayName, description: desc });
  }

  public fetchPageDetails(pageid: number | string) {
    return this.http.get<any>(`page/${pageid}`);
  }

  public fetchPageVersionList(pageid: number | string, current: number, size: number) {
    return this.http.get<any>(`page/${pageid}/versions`, { current, size });
  }

  public fetchPageVersionDetails(pageid: number | string, versionid: string | number) {
    return this.http.get<any>(`page/${pageid}/version/${versionid}`);
  }

  public fetchPageConfigList(pageid: number | string, current: number, size: number) {
    return this.http.get<any>(`page/${pageid}/configs`, { current, size });
  }

  public fetchPageConfigDetails(pageid: number | string, configid: string | number) {
    return this.http.get<any>(`page/${pageid}/config/${configid}`);
  }

  public fetchConfigDetails(configid: string | number) {
    return this.http.get<any>(`config/${configid}`);
  }

  public fetchVersionDetails(versionid: string | number) {
    return this.http.get<any>(`version/${versionid}`);
  }

  public fetchTaskLogs(taskid: number | string) {
    return this.http.get<any>(`task/${taskid}/logs`);
  }

  public createSource(configs: any) {
    return this.http.post<IPreviewApiResult>("preview", { configs });
  }

  public async fetchUserInfos() {
    const userInfo: any = await this.http.get("user");
    this.userInfos = { ...this.userInfos, ...userInfo };
  }

  public toggleMenuCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }

  public setCurrentUrl(url: string) {
    this.menulist.forEach(group => {
      if (group.items.some(i => i.link === url)) {
        group.selected = true;
      } else {
        group.selected = false;
      }
    });
  }
}
