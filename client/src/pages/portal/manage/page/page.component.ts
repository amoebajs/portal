import { Component, OnInit, ViewChild, TemplateRef } from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { PortalService } from "../../services/portal.service";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-portal-manage-page",
  templateUrl: "./page.html",
})
export class ManagePageComponent implements OnInit {
  @ViewChild("versionContent", { static: true })
  private versionContent: TemplateRef<any>;

  @ViewChild("versionDistContent", { static: true })
  private distTpl: TemplateRef<any>;

  @ViewChild("taskLogContent", { static: true })
  private taskLogTpl: TemplateRef<any>;

  public id!: string;
  public details!: any;
  public version!: any;
  public versions!: any;
  public dist!: string;
  public logs!: string;

  public pagination = {
    current: 1,
    size: 10,
    total: 0,
  };

  constructor(route: ActivatedRoute, private portal: PortalService, private modal: NzModalService) {
    route.params.subscribe(async params => {
      this.id = params.id;
      await this.queryDetails(this.id);
      this.queryVersionList();
      this.queryVersion(this.details.versionId);
    });
  }

  ngOnInit(): void {}

  async queryDetails(id: number | string) {
    this.details = await this.portal.fetchPageDetails(id);
    // this.modal.info({
    //   nzTitle: "页面详情",
    //   nzWidth: 640,
    //   nzContent: this.detailsContent,
    // });
  }

  async queryVersionList() {
    const { items, current, size, total } = await this.portal.fetchPageVersionList(
      this.id,
      this.pagination.current,
      this.pagination.size,
    );
    this.versions = items;
    this.pagination.current = current;
    this.pagination.size = size;
    this.pagination.total = total;
  }

  async queryVersion(id: number | string) {
    const details = await this.portal.fetchPageVersionDetails(this.id, id);
    this.version = details;
    this.version.dist = JSON.stringify(JSON.parse(details.dist), null, "  ");
  }

  async showVersionTaskLog(id: string | number) {
    this.logs = await this.portal.fetchTaskLogs(id);
    this.modal.info({
      nzTitle: "构建信息",
      nzWidth: 800,
      nzContent: this.taskLogTpl,
    });
  }

  showVersionDist(id: string | number) {
    const dist = this.versions.find((i: any) => i.id === id)!.dist;
    this.dist = JSON.stringify(JSON.parse(dist), null, "  ");
    this.modal.info({
      nzTitle: "产物信息",
      nzWidth: 640,
      nzContent: this.distTpl,
    });
  }
}
