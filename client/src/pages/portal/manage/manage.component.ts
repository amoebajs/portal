import { Component, OnInit } from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { PortalService } from "../services/portal.service";

@Component({
  selector: "app-portal-manage",
  templateUrl: "./manage.html",
})
export class PortalManageComponent implements OnInit {
  private data!: any[];

  constructor(private portal: PortalService, private modal: NzModalService) {}

  ngOnInit(): void {
    this.initPageList();
  }

  private async initPageList() {
    this.data = await this.portal.fetchPageList(1, 50);
  }

  async onPageClick(id: number | string) {
    const details = await this.portal.fetchPageDetails(id);
    this.modal.info({
      nzTitle: "页面详情",
      nzContent: JSON.stringify(details, null, "  "),
    });
  }

  async onPageVersionClick(id: number | string) {
    const details = await this.portal.fetchPageVersionDetails(id);
    this.modal.info({
      nzTitle: "页面版本信息",
      nzContent: JSON.stringify(details, null, "  "),
    });
  }
}
