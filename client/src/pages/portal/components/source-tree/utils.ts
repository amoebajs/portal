import {
  ICompileContext,
  IComponentChildDefine,
  IDirectiveChildDefine,
  IPageDefine,
} from "../../services/builder.service";
import { ICleanPayload, IDisplay, IDisplayEntity, IPayload, ISourceTree, XType } from "./typings";

export function createDefaultConfigs(): ICompileContext {
  return {
    provider: "react",
    components: [],
    directives: [],
    compositions: [],
  };
}

function shakeUselessImports(entities: IDirectiveChildDefine[], items: Record<string, any>) {
  return Object.entries(items)
    .map(([, e]) => e)
    .filter(c => entities.findIndex(i => i.ref === c.id) >= 0);
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

export function findPath(target: IPageDefine | undefined, paths: string[], model: { id: string; type: XType }) {
  let path: string = "";
  let lastIndex = -1;
  if (!target) {
    return { found: undefined, path: "['page']", index: -1 };
  }
  let list: (IDirectiveChildDefine | IComponentChildDefine)[] = [];
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

export function getEntityDisplayName(
  tree: ISourceTree,
  target: IDisplayEntity | IPageDefine,
  old?: IDisplay<IDisplayEntity>,
): IDisplay<IDisplayEntity> {
  const { ref, children, directives, compositions, ...others } = target;
  let comp = tree.components.find(i => i.id === ref);
  if (!comp) comp = tree.compositions.find(i => i.id === ref);
  if (comp) {
    return {
      ...others,
      ref,
      children: (children || [])
        .map((i, index) => getEntityDisplayName(tree, i, old?.children?.[index]))
        .filter(i => !!i),
      directives: (directives || [])
        .map((i, index) => getEntityDisplayName(tree, i, old?.directives?.[index]))
        .filter(i => !!i),
      compositions: (compositions || [])
        .map((i, index) => getEntityDisplayName(tree, i, old?.compositions?.[index]))
        .filter(i => !!i),
      displayInfo: {
        displayName: comp.displayInfo.displayName,
        expanded: old?.displayInfo?.expanded ?? true,
      },
    };
  }
  const dire = tree.directives.find(i => i.id === ref);
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
