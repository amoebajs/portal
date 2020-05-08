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
import { NzModalRef, NzModalService } from "ng-zorro-antd";
import {
  Builder,
  ICompileContext,
  IComponentChildDefine,
  IComponentDefine,
  IDirectiveChildDefine,
  IDirectiveDefine,
  IPageDefine,
} from "../../services/builder.service";
import { IEntityEditResult } from "../entity-edit/entity-edit.component";
import { Subscription } from "rxjs";
import { EntityCUComponent, IEntityCUResult } from "../entity-cu/entity-cu.component";

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

interface ICleanPayload {
  type: "c" | "d" | "cs";
  value: any;
}

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

  public tree: ISourceTree;
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

  ngOnChanges(_: SimpleChanges): void {}

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
    let target!: any;
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
    this.lastModalOk = false;
    this.modelRef = this.modal.create({
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
    });
    const subps: Subscription[] = [];
    subps.push(
      this.modelRef.afterClose.subscribe(() => {
        subps.forEach(s => s.unsubscribe());
        this.modelRef.destroy();
        this.modelRef = void 0;
      }),
    );
    subps.push(
      this.modelRef.afterOpen.subscribe(() => {
        const instance = this.modelRef.getContentComponent();
        instance.modalRef = this.modelRef;
        subps.push(instance.onComplete.subscribe((e: any) => this.receiveEmitEntity(e)));
      }),
    );
  }

  public entityDeleteClick(model: IDisplay<IDisplayEntity>, type: XType, paths?: string) {
    const pathlist = (paths && paths.split("#")) || [];
    pathlist.push("target::" + model.id);
    const { found, path, index } = this.findPath(pathlist, { id: model.id, type });
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

  public checkIfShowChildren(entity: IDisplay<IPageDefine>, type: XType = "component") {
    if (type === "component") {
      return entity.children && entity.children.length > 0 && entity.displayInfo.expanded;
    }
    if (type === "directive") {
      return entity.directives && entity.directives.length > 0 && entity.displayInfo.expanded;
    }
    return false;
  }

  public receiveEmitEntity(e: IEntityCUResult) {
    this.createOrUpdateNode(e);
    const context = callContextValidation(this.context);
    this.onContextChange.emit(context);
    this.initTree(context);
  }

  private createOrUpdateNode({ result: e, paths }: IEntityCUResult) {
    const { found, path, index } = this.findPath(paths, { id: e.id, type: e.type });
    const { module: md, name, id, version, updateId, type: createType, parentId: pid, ...others } = e;
    console.log(pid);
    if (!found) {
      this.createNewNode(e.type, md, name, version, createType, path, id, others);
    } else {
      this.updateExistNode(e.type, path, others, index, id, updateId);
    }
  }

  private updateExistNode(
    type: XType,
    path: string,
    { input, attach }: Omit<IEntityEditResult, "module" | "id" | "version" | "type" | "name" | "updateId">,
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

  private findPath(paths: string[], model: { id: string; type: XType }) {
    let path: string = "";
    let lastIndex = -1;
    if (!this.tree.page) {
      return { found: undefined, path: "['page']", index: -1 };
    }
    let target: IDisplay<IDisplayEntity> = this.tree.page;
    let list: IDisplay<IDisplayEntity>[] = [];
    let isRoot = true;
    for (const sgm of paths) {
      const [sgmType, sgmValue] = sgm.split("::");
      if (sgmType === "component" || sgmType === "composition") {
        if (isRoot) {
          path += "['page']";
          isRoot = false;
        } else {
          lastIndex = (target.children || []).findIndex(i => i.id === sgmValue);
          target = target.children[lastIndex];
          list = target?.children || [];
          path += `['children'][${lastIndex}]`;
        }
        continue;
      }
      if (sgmType === "directive") {
        lastIndex = (target.directives || []).findIndex(i => i.id === sgmValue);
        target = target.directives[lastIndex];
        list = target?.directives || [];
        path += `['directives'][${lastIndex}]`;
        continue;
      }
      if (sgmType === "target") {
        if (model.type === "directive") {
          list = target.directives || [];
          lastIndex = list.findIndex(i => i.id === sgmValue);
          target = list[lastIndex];
          path += `['directives']`;
        } else {
          if (isRoot) {
            path += "['page']";
            isRoot = false;
          } else {
            list = target.children || [];
            lastIndex = list.findIndex(i => i.id === sgmValue);
            target = list[lastIndex];
            path += `['children']`;
          }
        }
        continue;
      }
    }
    return { index: lastIndex, found: target, path };
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
      this.tree.page = context.page && this.getEntityDisplayName(context.page, oldTree?.page);
    }
  }

  private getEntityDisplayName(
    target: IDisplayEntity | IPageDefine,
    old?: IDisplay<IDisplayEntity>,
  ): IDisplay<IDisplayEntity> {
    const { ref, children, directives, compositions, ...others } = target;
    let comp = this.tree.components.find(i => i.id === ref);
    if (!comp) comp = this.tree.compositions.find(i => i.id === ref);
    if (comp) {
      return {
        ...others,
        ref,
        children: (children || [])
          .map((i, index) => this.getEntityDisplayName(i, old?.children?.[index]))
          .filter(i => !!i),
        directives: (directives || [])
          .map((i, index) => this.getEntityDisplayName(i, old?.directives?.[index]))
          .filter(i => !!i),
        compositions: (compositions || [])
          .map((i, index) => this.getEntityDisplayName(i, old?.compositions?.[index]))
          .filter(i => !!i),
        displayInfo: {
          displayName: comp.displayInfo.displayName,
          expanded: old?.displayInfo?.expanded ?? true,
        },
      };
    }
    const dire = this.tree.directives.find(i => i.id === ref);
    if (dire) {
      return {
        ...others,
        ref,
        displayInfo: {
          displayName: dire.displayInfo.displayName,
          expanded: old?.displayInfo?.expanded ?? true,
        },
      };
    }
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

function getAllEntities(target?: IComponentChildDefine | IDirectiveChildDefine): IDirectiveChildDefine[] {
  if (!target) return [];
  const list: IDirectiveChildDefine[] = [];
  const hack = <IComponentChildDefine>target;
  list.push(...(hack.children || []));
  list.push(...(hack.directives || []));
  for (const iterator of hack.children || []) {
    list.push(...getAllEntities(iterator));
  }
  for (const iterator of hack.directives || []) {
    list.push(...getAllEntities(iterator));
  }
  return list;
}

export function callContextValidation(ctx: ICompileContext) {
  const context = ctx;
  const page = context.page;
  const entities = [page, ...getAllEntities(page)];
  if (!page) {
    context.components = [];
    context.directives = [];
    context.compositions = [];
    return { ...context };
  }
  const importGroup: Record<string, ICleanPayload> = {};
  const existDirectives: Record<string, any> = {};
  const existComponents: Record<string, any> = {};
  const existCompositions: Record<string, any> = {};
  (context.components || []).forEach(e => (importGroup[e.id] = { type: "c", value: e }));
  (context.directives || []).forEach(e => (importGroup[e.id] = { type: "d", value: e }));
  (context.compositions || []).forEach(e => (importGroup[e.id] = { type: "cs", value: e }));
  doChildrenRefCheck(page, importGroup, { existComponents, existCompositions, existDirectives }, true);
  const components = shakeUselessImports(entities, existComponents);
  const directives = shakeUselessImports(entities, existDirectives);
  const compositions = shakeUselessImports(entities, existCompositions);
  return { provider: context.provider, components, directives, compositions, page: context.page };
}

function shakeUselessImports(entities: IDirectiveChildDefine[], items: Record<string, any>) {
  return Object.entries(items)
    .map(([, e]) => e)
    .filter(c => entities.findIndex(i => i.ref === c.id) >= 0);
}

interface IPayload {
  ref: string;
  children?: IPayload[];
  directives?: IPayload[];
  root?: boolean;
}

function doChildrenRefCheck(
  page: IPayload,
  importGroup: Record<string, ICleanPayload>,
  exists: {
    existComponents: Record<string, any>;
    existCompositions: Record<string, any>;
    existDirectives: Record<string, any>;
  },
  checkSelf = false,
) {
  const directives: IPayload[] = page.directives || [];
  for (const e of directives) {
    // console.log(e);
    const element = importGroup[e.ref];
    if (element) {
      exists.existDirectives[e.ref] = element.value;
    }
  }
  const children: IPayload[] = [...(page.children || [])];
  if (checkSelf) children.unshift({ ref: page.ref, root: true });
  for (const d of children) {
    const element = importGroup[d.ref];
    if (element) {
      switch (element.type) {
        case "c":
          exists.existComponents[d.ref] = element.value;
          break;
        case "cs":
          exists.existCompositions[d.ref] = element.value;
          break;
        default:
          break;
      }
    }
    if (!d.root) {
      doChildrenRefCheck(d, importGroup, exists);
    }
  }
}

function createDefaultConfigs(): ICompileContext {
  return {
    provider: "react",
    components: [],
    directives: [],
    compositions: [],
  };
}
