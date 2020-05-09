import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { Builder } from "../../services/builder.service";
import { IDisplayImport, IDisplayModule, IEntityCreate } from "./typings";
import { createDisplayName } from "./utils";

@Component({
  selector: "app-portal-module-list",
  templateUrl: "./module-list.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleListComponent implements OnInit, OnDestroy {
  @Output()
  onEntityCreate = new EventEmitter<IEntityCreate>();

  public moduleList: IDisplayModule[] = [];

  constructor(private builder: Builder) {}

  ngOnInit(): void {
    this.initModuleList();
  }

  ngOnDestroy(): void {}

  onEntityClick(target: IDisplayImport, type: "component" | "directive") {
    this.onEntityCreate.emit({
      id: this.builder.Utils.createEntityId(),
      type,
      module: target.moduleName,
      name: target.name,
      displayName: target.displayName === target.name ? null : target.displayName,
      version: (<any>target.metadata.entity).version,
      metadata: target.metadata,
    });
  }

  public onModuleExpand(model: any) {
    model.displayInfo.expanded = !model.displayInfo.expanded;
  }

  private initModuleList() {
    this.moduleList = this.builder.moduleList.map<IDisplayModule>(i => {
      return {
        ...i,
        components: (i.components || []).map<IDisplayImport>(e => ({
          ...e,
          displayInfo: { displayName: createDisplayName(e) },
        })),
        directives: (i.directives || []).map<IDisplayImport>(e => ({
          ...e,
          displayInfo: { displayName: createDisplayName(e) },
        })),
        compositions: (i.compositions || []).map<IDisplayImport>(e => ({
          ...e,
          displayInfo: { displayName: createDisplayName(e) },
        })),
        displayInfo: {
          displayName: createDisplayName(i),
          expanded: true,
        },
      };
    });
  }
}
