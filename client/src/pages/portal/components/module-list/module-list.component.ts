import { Component, OnDestroy, OnInit, Output, EventEmitter, ChangeDetectionStrategy } from "@angular/core";
import { Builder, ICompileModule, IImportDeclaration } from "../../services/builder.service";

export interface IEntityCreate {
  id: string;
  type: "component" | "directive";
  module: string;
  name: string;
  displayName: string | null;
  version: string | number;
  metadata: IImportDeclaration["metadata"];
}

export interface IDisplayImport extends IImportDeclaration {
  displayInfo: { displayName: string };
}

export interface IDisplayModule extends Omit<ICompileModule, "components" | "directives"> {
  components: IDisplayImport[];
  directives: IDisplayImport[];
  displayInfo: {
    displayName: string;
    expanded: boolean;
  };
}

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
        displayInfo: {
          displayName: createDisplayName(i),
          expanded: true,
        },
      };
    });
  }
}

function createDisplayName(i: any) {
  return i.displayName !== i.name ? i.displayName + " (" + i.name + ")" : i.displayName;
}
