import { ICompileContext, IComponentChildDefine, IDirectiveChildDefine } from "../../services/builder.service";
import { ICleanPayload, IPayload } from "./typings";

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
