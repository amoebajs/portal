import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { PortalService } from "../../services/portal.service";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "app-portal-manage-pages",
  templateUrl: "./pages.html",
})
export class ManagePagesComponent implements OnInit {
  @ViewChild("PageCreateForm") createForm: TemplateRef<HTMLElement>;

  public data!: any;
  public formData: FormGroup = this.createEmptyCreation();

  constructor(private portal: PortalService, private modal: NzModalService, private formBuilder: FormBuilder) {}

  ngOnInit(): void {
    this.initPageList();
  }

  createPage() {
    this.formData = this.createEmptyCreation();
    this.modal.create({
      nzTitle: "Create Page",
      nzWidth: 600,
      nzContent: this.createForm,
      nzOnOk: async () => {
        const { name, displayName, description } = this.formData.value;
        await this.portal.createPage(name, displayName, description);
        this.initPageList();
      },
      nzOnCancel: () => {},
    });
  }

  async editPage(id: string | number) {
    const data = await this.portal.fetchPageDetails(id);
    this.formData = this.formBuilder.group({
      name: [data.name, Validators.required],
      description: [data.description],
      displayName: [data.displayName],
    });
    this.modal.create({
      nzTitle: "Edit Page",
      nzWidth: 600,
      nzContent: this.createForm,
      nzOnOk: async () => {
        const { name, displayName, description } = this.formData.value;
        await this.portal.updatePage(id, name, displayName, description);
        this.initPageList();
      },
      nzOnCancel: () => {},
    });
  }

  private async initPageList() {
    this.data = await this.portal.fetchPageList(1, 50);
  }

  private createEmptyCreation() {
    return this.formBuilder.group({
      name: ["", Validators.required],
      description: [""],
      displayName: [""],
    });
  }
}
