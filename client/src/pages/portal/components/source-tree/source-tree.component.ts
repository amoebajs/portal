import get from "lodash/get";
import set from "lodash/set";
import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  TemplateRef,
} from "@angular/core";
import { NzModalRef, NzModalService } from "ng-zorro-antd";
import {
  ICompileContext,
  IComponentDefine,
  IDirectiveDefine,
  Builder,
  IPageDefine,
} from "../../services/builder.service";
import { IEntityEdit, IEntityEditResult } from "../entity-edit/entity-edit.component";
import { IEntityCreate } from "../module-list/module-list.component";
import { Subscription } from "rxjs";

type IDisplay<T> = T & {
  displayInfo: {
    displayName: string;
    expanded: boolean;
  };
};

interface ISourceTree {
  components: IDisplay<IComponentDefine>[];
  directives: IDisplay<IDirectiveDefine>[];
  compositions: IDisplay<IDirectiveDefine>[];
  compExpanded: boolean;
  direExpanded: boolean;
  cpsiExpanded: boolean;
  page?: IDisplay<IDisplayEntity>;
}

interface IDisplayEntity extends IPageDefine {
  children?: IDisplay<IDisplayEntity>[];
  directives?: IDisplay<IDisplayEntity>[];
  compositions?: IDisplay<IDisplayEntity>[];
}

type XType = "component" | "directive" | "composition";

@Component({
  selector: "app-portal-source-tree",
  templateUrl: "./source-tree.html",
})
export class SourceTreeComponent implements OnInit, OnDestroy, OnChanges {
  @Input()
  context: ICompileContext;

  @Output()
  onContextChange = new EventEmitter<ICompileContext>();

  @ViewChild("createModalContent", { static: false })
  private createModalContent: TemplateRef<any>;

  @ViewChild("editModalContent", { static: false })
  private editModalContent: TemplateRef<any>;

  @ViewChild("deleteModalContext", { static: false })
  private deleteModalContext: TemplateRef<any>;

  public tree: ISourceTree;
  public tempEntityData!: IEntityEdit | null;
  public tempParentPath!: string[];
  public willDelete!: IDisplay<IDisplayEntity>;

  private modelRef!: NzModalRef;
  private lastModalOk = false;

  private subp!: Subscription;

  public get onLoad() {
    return this.builder.onLoad;
  }

  public get onLoadError() {
    return this.builder.onLoadError;
  }

  constructor(private builder: Builder, private modal: NzModalService) {}

  ngOnInit(): void {
    this.subp = this.builder.onLoad.subscribe(loaded => {
      if (loaded === true) {
        this.initTree(this.context || createDefaultConfigs());
      }
    });
  }

  ngOnDestroy(): void {
    if (this.modelRef) {
      this.modelRef.destroy();
    }
    if (this.subp && !this.subp.closed) {
      this.subp.unsubscribe();
    }
  }

  ngOnChanges(changes: import("@angular/core").SimpleChanges): void {}

  public entityCreateClick(model: IDisplay<IDisplayEntity>, type: XType, paths?: string) {
    if (this.modelRef) {
      this.modelRef.destroy();
    }
    this.lastModalOk = false;
    this.tempParentPath = (paths && paths.split("#")) || [];
    model && this.tempParentPath.push(model.id);
    this.modelRef = this.modal.create({
      nzTitle: "创建节点",
      nzContent: this.createModalContent,
      nzWidth: "500px",
      nzOnOk: () => (this.lastModalOk = true),
      nzOnCancel: () => {},
    });
  }

  public entityEditClick(model: IDisplay<IDisplayEntity>, type: XType, paths?: string) {
    if (this.modelRef) {
      this.modelRef.destroy();
    }
    const parentPaths = (paths && paths.split("#")) || [];
    parentPaths.push(model.id);
    const meta = this.getEntityMetaWithRef(model);
    this.lastModalOk = false;
    this.tempEntityData = {
      id: model.id,
      module: meta.moduleName,
      name: meta.name,
      displayName: meta.displayName === meta.name ? null : meta.displayName,
      version: (<any>meta.metadata.entity).version,
      metadata: meta.metadata,
      type,
      source: model,
    };
    this.tempParentPath = parentPaths;
    this.modelRef = this.modal.create({
      nzTitle: "编辑节点",
      nzContent: this.editModalContent,
      nzWidth: "800px",
      nzOnOk: () => (this.lastModalOk = true),
      nzOnCancel: () => {},
    });
  }

  public entityDeleteClick(model: IDisplay<IDisplayEntity>, type: XType, paths?: string) {
    const { found, path, index } = this.findPath((paths && paths.split("#")) || [], model);
    if (found) {
      this.willDelete = found;
      const ref = this.modal.warning({
        nzTitle: "确认删除节点吗?",
        nzCancelText: "Cancel",
        nzContent: this.deleteModalContext,
        nzOnOk: () => {
          const target = get(this.context, path);
          if (Array.isArray(target)) {
            target.splice(index, 1);
          } else if (path === "['page']") {
            delete this.context["page"];
          }
          const context = callContextValidation(this.context);
          this.onContextChange.emit(context);
          this.initTree(context);
          ref.destroy();
          this.willDelete = null;
        },
        nzOnCancel: () => {
          ref.destroy();
          this.willDelete = null;
        },
      });
    }
  }

  public entityExpand(entity: IDisplay<IPageDefine>) {
    entity.displayInfo.expanded = !entity.displayInfo.expanded;
  }

  public groupExpand(type: XType) {
    if (type === "component") {
      this.tree.compExpanded = !this.tree.compExpanded;
    } else if (type === "composition") {
      this.tree.cpsiExpanded = !this.tree.cpsiExpanded;
    } else {
      this.tree.direExpanded = !this.tree.direExpanded;
    }
  }

  public checkIfShowChildren(entity: IDisplay<IPageDefine>) {
    return entity.children && entity.children.length > 0 && entity.displayInfo.expanded;
  }

  public saveEntityTemp(e: IEntityCreate) {
    this.tempEntityData = e;
    if (this.modelRef) {
      this.modelRef.getInstance().nzWidth = "800px";
    }
  }

  public editGoBack() {
    this.tempEntityData = null;
    if (this.modelRef) {
      this.modelRef.getInstance().nzWidth = "500px";
    }
  }

  public receiveEmitEntity(e: IEntityEditResult) {
    this.tempEntityData = null;
    if (!this.lastModalOk) return;
    this.createOrUpdateNode(e);
    this.tempParentPath = [];
    this.onContextChange.emit(this.context);
    this.initTree(this.context);
  }

  private createOrUpdateNode(e: IEntityEditResult) {
    const { found, path, index } = this.findPath(this.tempParentPath, e);
    const { module: md, name, id, version, type: createType, ...others } = e;
    if (!found) {
      //create
      this.createNewNode(md, name, version, createType, path, id, others);
    } else {
      // edit
      this.updateExistNode(path, others, index);
    }
  }

  private updateExistNode(
    path: string,
    others: Omit<IEntityEditResult, "module" | "id" | "version" | "type" | "name">,
    index: number,
  ) {
    if (path === "['page']") {
      this.context.page = {
        ...this.context.page,
        ...others,
      };
    } else {
      const children = get(this.context, path);
      children[index] = {
        ...children[index],
        ...others,
      };
    }
  }

  private createNewNode(
    md: string,
    name: string,
    version: string | number,
    createType: XType,
    path: string,
    id: string,
    others: Omit<IEntityEditResult, "module" | "id" | "version" | "type" | "name">,
  ) {
    const target = this.getImportTargetSafely(md, name, version, createType);
    if (path === "['page']") {
      this.context.page = {
        id,
        ref: target.id,
        ...others,
      };
    } else {
      let children = get(this.context, path);
      if (!children) {
        set(this.context, path, (children = []));
      }
      children.push({
        id,
        ref: target.id,
        ...others,
      });
    }
  }

  private getImportTargetSafely(md: string, name: string, version: string | number, createType: XType) {
    let target: IComponentDefine | IDirectiveDefine = this.getImportTarget(md, name);
    if (!target) {
      target = {
        id: this.builder.Utils.createEntityId(),
        module: md,
        name,
        version,
      };
      if (createType === "component") {
        this.context.components = this.context.components || [];
        this.context.components.push(target);
      } else if (createType === "composition") {
        this.context.compositions = this.context.compositions || [];
        this.context.compositions.push(target);
      } else {
        this.context.directives = this.context.directives || [];
        this.context.directives.push(target);
      }
    }
    return target;
  }

  private findPath(paths: string[], model: { id: string }) {
    let found!: IDisplay<IDisplayEntity>;
    let path: string = "";
    let isRoot = true;
    let lastIndex = -1;
    if (!this.tree.page) {
      return { found: undefined, path: "['page']", index: -1 };
    }
    let list: IDisplay<IDisplayEntity>[] = [this.tree.page];
    paths.push(model.id);
    for (const ph of paths) {
      lastIndex = list.findIndex(i => i.id === ph);
      if (isRoot) {
        isRoot = false;
        path += ph === model.id ? "['page']" : "['page']['children']";
      } else if (ph !== model.id) {
        path += `[${lastIndex}]['children']`;
      }
      found = list[lastIndex];
      if (!found || !found.children) continue;
      list = found.children || [];
      if (ph === model.id) {
        break;
      }
    }
    return { index: lastIndex, found, path };
  }

  private initTree(context: ICompileContext) {
    const components = (context.components || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: getDisplayText(this.builder.getComponent(i.module, i.name).displayName, i.name),
        expanded: false,
      },
    }));
    const directives = (context.directives || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: getDisplayText(this.builder.getDirective(i.module, i.name).displayName, i.name),
        expanded: false,
      },
    }));
    const compositions = (context.compositions || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: getDisplayText(this.builder.getComposition(i.module, i.name).displayName, i.name),
        expanded: false,
      },
    }));
    const oldTree = this.tree;
    this.tree = {
      page: null,
      directives,
      components,
      compositions,
      compExpanded: false,
      direExpanded: false,
      cpsiExpanded: false,
    };
    if (oldTree) {
      this.tree.compExpanded = oldTree.compExpanded;
      this.tree.direExpanded = oldTree.direExpanded;
    }
    if (context.page) {
      this.tree.page = context.page && this.getEntityDisplayName(context.page);
    }
  }

  private getEntityDisplayName(target: IDisplayEntity | IPageDefine): IDisplay<IDisplayEntity> {
    const { ref } = target;
    const { children, directives, compositions, ...others } = target;
    let comp = this.tree.components.find(i => i.id === ref);
    if (!comp) comp = this.tree.compositions.find(i => i.id === ref);
    if (comp) {
      return {
        ...others,
        children: (children || []).map(i => this.getEntityDisplayName(i)).filter(i => !!i),
        directives: (directives || []).map(i => this.getEntityDisplayName(i)).filter(i => !!i),
        compositions: (compositions || []).map(i => this.getEntityDisplayName(i)).filter(i => !!i),
        displayInfo: {
          displayName: comp.displayInfo.displayName,
          expanded: true,
        },
      };
    }
  }

  private getEntityMetaWithRef(model: IDisplay<IDisplayEntity>) {
    console.log(model);
    const comp = this.tree.components.find(i => i.id === model.ref);
    if (comp) {
      return this.builder.getComponent(comp.module, comp.name);
    }
    const dire = this.tree.directives.find(i => i.id === model.ref);
    if (dire) {
      return this.builder.getDirective(comp.module, comp.name);
    }
    const cpsi = this.tree.compositions.find(i => i.id === model.ref);
    if (cpsi) {
      return this.builder.getComposition(cpsi.module, cpsi.name);
    }
  }

  private getImportTarget(module: string, name: string) {
    const comp = this.tree.components.find(i => i.module === module && i.name === name);
    if (comp) {
      return comp;
    }
    const dire = this.tree.directives.find(i => i.module === module && i.name === name);
    if (dire) {
      return dire;
    }
  }
}

function getDisplayText(displayName: string, name: string): string {
  return displayName === name ? displayName : `${displayName} (${name})`;
}

export function callContextValidation(ctx: ICompileContext) {
  const context = ctx;
  const page = context.page;
  if (!page) {
    context.components = [];
    context.directives = [];
    return { ...context };
  }
  const importGroup: Record<string, any> = {};
  const existDirectives: Record<string, any> = {};
  const existComponents: Record<string, any> = {};
  (context.components || []).forEach(e => (importGroup[e.id] = { type: "c", value: e }));
  (context.directives || []).forEach(e => (importGroup[e.id] = { type: "d", value: e }));
  const directives = page.directives || [];
  for (const d of directives) {
    const element = importGroup[d.ref];
    if (element) {
      existDirectives[d.ref] = element.value;
    }
  }
  doChildrenRefCheck(page, importGroup, existComponents);
  context.components = Object.entries(existComponents).map(([, e]) => e);
  context.directives = Object.entries(existDirectives).map(([, e]) => e);
  return { ...context };
}

function doChildrenRefCheck(page: IPageDefine, importGroup: Record<string, any>, existComponents: Record<string, any>) {
  const children = page.children || [];
  for (const d of children) {
    const element = importGroup[d.ref];
    if (element) {
      existComponents[d.ref] = element.value;
    }
    doChildrenRefCheck(d, importGroup, existComponents);
  }
}

function createDefaultConfigs(): ICompileContext {
  return {
    provider: "react",
    components: [],
    directives: [],
  };
}
