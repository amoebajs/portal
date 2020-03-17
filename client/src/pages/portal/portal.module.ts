import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PortalRootComponent } from "./root/root.component";
import { PortalLayoutComponent } from "./layout/layout.component";
import { CommonsModule } from "../../shared/commons.module";
import { PortalService } from "./services/portal.service";
import { PortalSettingComponent } from "./setting/setting.component";
import { PortalPreviewComponent } from "./preview/preview.component";
import { Builder } from "./services/builder.service";
import { ModuleListComponent } from "./components/module-list/module-list.component";
import { EntityEditComponent } from "./components/entity-edit/entity-edit.component";
import { SourceTreeComponent } from "./components/source-tree/source-tree.component";
import { PortalManageComponent } from "./manage/manage.component";

const routes: Routes = [
  { path: "", component: PortalRootComponent, data: { title: "控制台" } },
  { path: "manage/pages", component: PortalManageComponent, data: { title: "页面管理" } },
  { path: "preview/create", component: PortalPreviewComponent, data: { title: "创建页面" } },
  { path: "preview/edit/:version", component: PortalPreviewComponent, data: { title: "编辑页面" } },
  { path: "settings", component: PortalSettingComponent, data: { title: "设置" } },
];

@NgModule({
  declarations: [
    PortalLayoutComponent,
    PortalRootComponent,
    PortalManageComponent,
    PortalSettingComponent,
    PortalPreviewComponent,
    ModuleListComponent,
    EntityEditComponent,
    SourceTreeComponent,
  ],
  imports: [CommonsModule, RouterModule.forChild(routes)],
  providers: [PortalService, Builder],
  entryComponents: [EntityEditComponent],
})
export class PortalModule {}
