import { Component, OnInit } from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { PortalService } from "../../services/portal.service";

@Component({
  selector: "app-portal-manage-pages",
  templateUrl: "./pages.html",
})
export class ManagePagesComponent implements OnInit {
  public data!: any;

  constructor(private portal: PortalService, private modal: NzModalService) {}

  ngOnInit(): void {
    this.initPageList();
  }

  private async initPageList() {
    this.data = await this.portal.fetchPageList(1, 50);
  }
}
