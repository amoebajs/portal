import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { UseRouter } from "./router";
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
  imports: [
    CommonsModule,
    RouterModule.forChild(
      UseRouter({
        index: PortalRootComponent,
        pages: PortalManageComponent,
        create: PortalPreviewComponent,
        edit: PortalPreviewComponent,
        settings: PortalSettingComponent,
      }),
    ),
  ],
  providers: [PortalService, Builder],
  entryComponents: [EntityEditComponent],
})
export class PortalModule {}
