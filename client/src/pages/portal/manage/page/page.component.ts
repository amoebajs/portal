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

  @ViewChild("detailsContent", { static: true })
  private detailsContent: TemplateRef<any>;

  public id!: string;
  public details!: any;
  public version!: any;
  public versions!: any;

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
    this.versions = await this.portal.fetchPageVersionList(this.id, 1, 50);
  }

  async queryVersion(id: number | string) {
    const details = await this.portal.fetchPageVersionDetails(this.id, id);
    this.version = details;
    this.version.dist = JSON.stringify(JSON.parse(details.dist), null, "  ");
    // this.modal.info({
    //   nzTitle: "页面版本信息",
    //   nzWidth: 640,
    //   nzContent: this.versionContent,
    // });
  }
}
