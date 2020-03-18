import { Component, OnInit, ViewChild, TemplateRef } from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { PortalService } from "../services/portal.service";

@Component({
  selector: "app-portal-manage",
  templateUrl: "./manage.html",
})
export class PortalManageComponent implements OnInit {
  @ViewChild("versionContent", { static: true })
  private versionContent: TemplateRef<any>;

  @ViewChild("detailsContent", { static: true })
  private detailsContent: TemplateRef<any>;

  public data!: any;
  public details!: any;
  public version!: any;

  constructor(private portal: PortalService, private modal: NzModalService) {}

  ngOnInit(): void {
    this.initPageList();
  }

  private async initPageList() {
    this.data = await this.portal.fetchPageList(1, 50);
  }

  async onPageClick(id: number | string) {
    const details = await this.portal.fetchPageDetails(id);
    this.details = JSON.stringify(details, null, "  ");
    this.modal.info({
      nzTitle: "页面详情",
      nzWidth: 640,
      nzContent: this.detailsContent,
    });
  }

  async onPageVersionClick(id: number | string) {
    const details = await this.portal.fetchPageVersionDetails(id);
    this.version = details;
    this.version.dist = JSON.stringify(JSON.parse(details.dist), null, "  ");
    this.modal.info({
      nzTitle: "页面版本信息",
      nzWidth: 640,
      nzContent: this.versionContent,
    });
  }
}
