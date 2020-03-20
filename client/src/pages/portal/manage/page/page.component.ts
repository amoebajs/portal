import yamljs from "js-yaml";
import { Component, OnInit, ViewChild, TemplateRef } from "@angular/core";
import { NzModalService, NzNotificationService } from "ng-zorro-antd";
import { PortalService } from "../../services/portal.service";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-portal-manage-page",
  templateUrl: "./page.html",
})
export class ManagePageComponent implements OnInit {
  @ViewChild("versionDistContent", { static: true })
  private versionDistTpl: TemplateRef<any>;

  @ViewChild("configDataContent", { static: true })
  private configDataTpl: TemplateRef<any>;

  @ViewChild("taskLogContent", { static: true })
  private taskLogTpl: TemplateRef<any>;

  public id!: string;
  public details!: any;
  public version!: any;
  public config!: any;
  public dist!: string;
  public logs!: string;

  public modalContent = {
    version: "{}",
    config: "{}",
  };

  public versions = {
    items: [],
    pagination: {
      current: 1,
      size: 10,
      total: 0,
    },
  };

  public configs = {
    items: [],
    pagination: {
      current: 1,
      size: 10,
      total: 0,
    },
  };

  constructor(
    route: ActivatedRoute,
    private portal: PortalService,
    private modal: NzModalService,
    private notify: NzNotificationService,
  ) {
    route.params.subscribe(async params => {
      this.id = params.id;
      this.initPageData();
    });
  }

  private async initPageData() {
    await this.queryDetails(this.id);
    this.queryVersionList();
    this.queryConfigList();
    const [version, config] = await Promise.all([
      this.queryVersion(this.details.versionId),
      this.queryConfig(this.details.configId),
    ]);
    this.version = version;
    this.config = config;
  }

  ngOnInit(): void {}

  async queryDetails(id: number | string) {
    try {
      this.details = await this.portal.fetchPageDetails(id);
    } catch (error) {
      this.notify.error("查询页面信息失败", error);
    }
  }

  async queryVersionList() {
    try {
      const { items, ...pagination } = await this.portal.fetchPageVersionList(
        this.id,
        this.versions.pagination.current,
        this.versions.pagination.size,
      );
      this.versions = { items, pagination };
    } catch (error) {
      this.notify.error("查询页面版本失败", error);
    }
  }

  async queryConfigList() {
    try {
      const { items, ...pagination } = await this.portal.fetchPageConfigList(
        this.id,
        this.configs.pagination.current,
        this.configs.pagination.size,
      );
      this.configs = { items, pagination };
    } catch (error) {
      this.notify.error("查询页面配置失败", error);
    }
  }

  async queryVersion(id: number | string) {
    try {
      return await this.portal.fetchPageVersionDetails(this.id, id);
    } catch (error) {
      this.notify.error("查询版本详情失败", error);
    }
  }

  async queryConfig(id: number | string) {
    try {
      return this.portal.fetchPageConfigDetails(this.id, id);
    } catch (error) {
      this.notify.error("查询配置详情失败", error);
    }
  }

  async showVersionTaskLog(id: string | number) {
    try {
      this.logs = await this.portal.fetchTaskLogs(id);
      this.modal.info({
        nzTitle: "构建信息",
        nzWidth: 800,
        nzContent: this.taskLogTpl,
      });
    } catch (error) {
      this.notify.error("查询构建任务日志失败", error);
    }
  }

  async showVersionDist(id: string | number) {
    const dist = await this.queryVersion(id);
    this.modalContent.version = JSON.stringify(JSON.parse(dist.dist), null, "  ");
    this.modal.info({
      nzTitle: "产物信息",
      nzWidth: 640,
      nzContent: this.versionDistTpl,
    });
  }

  async showConfigDist(id: string | number) {
    const dist = await this.queryConfig(id);
    this.modalContent.config = yamljs.safeDump(JSON.parse(dist.data));
    this.modal.info({
      nzTitle: "模板配置",
      nzWidth: 800,
      nzContent: this.configDataTpl,
    });
  }
}
