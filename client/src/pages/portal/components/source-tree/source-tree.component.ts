import get from "lodash/get";
import set from "lodash/set";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { NzModalService } from "ng-zorro-antd";
import { Subscription } from "rxjs";
import {
  Builder,
  ICompileContext,
  IComponentDefine,
  IDirectiveDefine,
  IPageDefine,
} from "../../services/builder.service";
import { IEntityEdit, IEntityEditResult } from "../entity-edit/typings";
import { EntityCUComponent } from "../entity-cu/entity-cu.component";
import { IDisplay, IDisplayEntity, ISourceTree, XType } from "./typings";
import { callContextValidation, createDefaultConfigs, findPath, getEntityDisplayName } from "./utils";

@Component({
  selector: "app-portal-source-tree",
  templateUrl: "./source-tree.html",
})
export class SourceTreeComponent implements OnInit, OnDestroy, OnChanges {
  @Input()
  context: ICompileContext;

  @Output()
  onContextChange = new EventEmitter<ICompileContext>();

  @ViewChild("deleteModalContext")
  private deleteModalContext: TemplateRef<any>;

  public init = false;
  public tree: ISourceTree;
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
        this.init = true;
        this.initTree(this.context || createDefaultConfigs());
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const entries = Object.entries(changes);
    for (const [key, iterator] of entries) {
      if (key === "context" && this.init) {
        this.initTree(iterator.currentValue);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.subp && !this.subp.closed) {
      this.subp.unsubscribe();
    }
  }

  public checkIfExpanded(model: IDisplayEntity) {
    return (
      (model.children && model.children.length > 0) ||
      (model.directives && model.directives.length > 0) ||
      (model.compositions && model.compositions.length > 0)
    );
  }

  public useImportIcon(type: XType) {
    return type === "component" ? "appstore" : type === "composition" ? "code-sandbox" : "api";
  }

  public useImportLabel(type: XType) {
    return type === "component" ? "组件" : type === "composition" ? "捆绑" : "指令";
  }

  public useImportsExpand(type: XType) {
    return type === "component"
      ? this.tree.compExpanded
      : type === "composition"
      ? this.tree.cpsiExpanded
      : this.tree.direExpanded;
  }

  public useTitleIcon(type: XType) {
    return type === "directive" ? "control" : "layout";
  }

  public pushModelPathSection(type: XType, model: IDisplayEntity, paths?: string[]) {
    return !paths ? type + "::" + model.id : paths + "#" + type + "::" + model.id;
  }

  public entityEditClick(
    mode: "create" | "edit",
    model: IDisplay<IDisplayEntity>,
    parent: IDisplay<IDisplayEntity> | undefined,
    type: XType,
    paths?: string,
  ) {
    let target!: IEntityEdit;
    const plist: string[] = (paths && paths.split("#")) || [];
    if (mode === "edit") {
      plist.push("target::" + model.id);
      const meta = this.getEntityMetaWithRef(model, type);
      target = {
        id: model.id,
        module: meta.moduleName,
        name: meta.name,
        displayName: meta.displayName === meta.name ? null : meta.displayName,
        version: (<any>meta.metadata.entity).version,
        metadata: meta.metadata,
        type,
        source: model,
      };
    } else {
      plist.push(`${type}::` + model?.id ?? "undefined");
      plist.push(`target::` + "");
    }
    const ref = this.modal.create({
      nzTitle: mode === "edit" ? "编辑节点" : "创建节点",
      nzWidth: mode === "edit" ? 800 : 500,
      nzFooter: null,
      nzContent: EntityCUComponent,
      nzComponentParams: {
        context: this.context,
        paths: plist,
        target,
        parent,
      },
      nzOnOk: instance => {
        this.receiveEmitEntity(instance);
      },
    });
    const subps: Subscription[] = [];
    subps.push(
      ref.afterClose.subscribe(() => {
        subps.forEach(s => s.unsubscribe());
        ref.destroy();
      }),
    );
    subps.push(
      ref.afterOpen.subscribe(() => {
        const instance = ref.getContentComponent();
        instance.modalRef = ref;
      }),
    );
  }

  public entityDeleteClick(model: IDisplay<IDisplayEntity>, type: XType, paths?: string) {
    const pathlist = (paths && paths.split("#")) || [];
    pathlist.push("target::" + model.id);
    const { found, path, index } = findPath(this.context.page, pathlist, { id: model.id, type });
    if (found) {
      const ref = this.modal.warning({
        nzTitle: "确认删除节点吗?",
        nzCancelText: "Cancel",
        nzContent: this.deleteModalContext,
        nzComponentParams: { willDelete: found },
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
        },
        nzOnCancel: () => ref.destroy(),
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

  public checkIfShowChildren(entity: IDisplay<IPageDefine>, type: XType = "component") {
    if (type === "component") {
      return entity.children && entity.children.length > 0 && entity.displayInfo.expanded;
    }
    if (type === "directive") {
      return entity.directives && entity.directives.length > 0 && entity.displayInfo.expanded;
    }
    return false;
  }

  public receiveEmitEntity(e: EntityCUComponent) {
    this.createOrUpdateNode(e);
    const context = callContextValidation(this.context);
    this.onContextChange.emit(context);
    this.initTree(context);
  }

  private createOrUpdateNode({ result: e, paths }: EntityCUComponent) {
    const { found, path, index } = findPath(this.context.page, paths, { id: e.id, type: e.type });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { module: md, name, id, version, updateId, type: createType, parentId: _, ...others } = e;
    if (!found) {
      this.createNewNode(e.type, md, name, version, createType, path, id, others);
    } else {
      this.updateExistNode(e.type, path, others, index, id, updateId);
    }
  }

  private updateExistNode(
    type: XType,
    path: string,
    { input, attach }: Omit<IEntityEditResult, "module" | "id" | "version" | "type" | "name" | "updateId" | "parentId">,
    index: number,
    oldid: string,
    update: string,
  ) {
    if (path === "['page']") {
      this.context.page = { ...this.context.page, input, id: update };
      return;
    }
    if (type !== "directive") {
      const children = get(this.context, path);
      children[index] = { ...children[index], input, id: update };
      this.createUpdateAttach(path.replace(/\['children'\]$/, "['attach']"), attach, oldid, update);
      return;
    }
    const directives = get(this.context, path);
    directives[index] = { ...directives[index], input, id: update };
  }

  private createNewNode(
    type: XType,
    md: string,
    name: string,
    version: string | number,
    createType: XType,
    path: string,
    id: string,
    { input, attach }: Omit<IEntityEditResult, "module" | "id" | "version" | "type" | "name" | "updateId">,
  ) {
    const target = this.getImportTargetSafely(md, name, version, createType);
    if (path === "['page']") {
      this.context.page = { id, ref: target.id, input };
      return;
    }
    if (type !== "directive") {
      let children = get(this.context, path);
      if (!children) set(this.context, path, (children = []));
      children.push({ id, ref: target.id, input });
      this.createUpdateAttach(path, attach, id);
      return;
    }
    let directives = get(this.context, path);
    if (!directives) set(this.context, path, (directives = []));
    directives.push({ id, ref: target.id, input });
  }

  private createUpdateAttach(path: string, attach: Record<string, any>, oldid: string, updateid?: string) {
    const entries = Object.entries(attach);
    let attaches = get(this.context, path);
    if (!attaches) set(this.context, path, (attaches = {}));
    for (const [key, value] of entries) {
      const matches: any = attaches[key] ?? (attaches[key] = { type: "childRefs", expression: [] });
      const found = matches.expression.find((i: any) => i.id === oldid);
      if (found) {
        found.id = updateid ?? oldid;
        found.value = value;
      } else {
        matches.expression.push({ id: updateid ?? oldid, value });
      }
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

  private initTree(context: ICompileContext) {
    const oldTree = this.tree;
    const components = (context.components || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: this.builder.getComponent(i.module, i.name).displayName,
        expanded: false,
      },
    }));
    const directives = (context.directives || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: this.builder.getDirective(i.module, i.name).displayName,
        expanded: false,
      },
    }));
    const compositions = (context.compositions || []).map(i => ({
      ...i,
      displayInfo: {
        displayName: this.builder.getComposition(i.module, i.name).displayName,
        expanded: false,
      },
    }));
    const tree = {
      page: null,
      directives,
      components,
      compositions,
      compExpanded: false,
      direExpanded: false,
      cpsiExpanded: false,
    };
    if (oldTree) {
      tree.compExpanded = oldTree.compExpanded;
      tree.direExpanded = oldTree.direExpanded;
    }
    if (context.page) {
      tree.page = context.page && getEntityDisplayName(tree, context.page, oldTree?.page);
    }
    this.tree = tree;
  }

  private getEntityMetaWithRef(model: IDisplay<IDisplayEntity>, type: XType) {
    if (type === "component") {
      const comp = this.tree.components.find(i => i.id === model.ref);
      if (comp) {
        return this.builder.getComponent(comp.module, comp.name);
      }
    } else if (type === "composition") {
      const cpsi = this.tree.compositions.find(i => i.id === model.ref);
      if (cpsi) {
        return this.builder.getComposition(cpsi.module, cpsi.name);
      }
    } else {
      const dire = this.tree.directives.find(i => i.id === model.ref);
      if (dire) {
        return this.builder.getDirective(dire.module, dire.name);
      }
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
    const cops = this.tree.compositions.find(i => i.module === module && i.name === name);
    if (cops) {
      return cops;
    }
  }
}
