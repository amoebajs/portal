import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output } from "@angular/core";
import {
  Builder,
  ICompileContext,
  IComponentChildDefine,
  IDirectiveChildDefine,
  IGroupDefine,
  IInputDefine,
} from "../../services/builder.service";
import { IEntityCreate } from "../module-list/module-list.component";
import { NzMessageService } from "ng-zorro-antd";

type IEntity = IComponentChildDefine | IDirectiveChildDefine;

interface IDataInput {
  define: IInputDefine;
  value: number | string | [any, any][] | null;
  type: string;
  selectList?: boolean;
  enumValues?: { key: string | number; value: any }[];
  typeCheck?: (v: any) => boolean;
  refObservables?: string[];
}

interface IEntityContext {
  init: boolean;
  entityId: string;
  displayName: string;
  idVersion: string;
  inputs: IGroup[];
  attaches: IInputDefine[];
  data: {
    inputs: Record<string, IDataInput>;
  };
}

interface IScope {}

type IDisplayInput = IInputDefine & {
  displayInfo: {
    displayName: string | null;
    fullname: string;
  };
};

interface IGroup {
  name: string;
  children: IDisplayInput[];
  displayInfo: {
    displayName: string | null;
  };
}

export interface IEntityEdit extends IEntityCreate {
  /** 原始数据，编辑情况才会有 */
  source?: IComponentChildDefine | IDirectiveChildDefine;
}

export interface IEntityEditResult {
  id: string;
  parentId?: string;
  updateId: string;
  module: string;
  name: string;
  type: "component" | "directive" | "composition";
  version: string | number;
  input: Record<string, any>;
  attach: Record<string, any>;
}

interface IAttachItem {
  define: any;
  value: any;
}

const DEFAULT_ENUM_VALUE_LABEL = "默认值";
const DEFAULT_ENUM_VALUE = "?##default##?";

@Component({
  selector: "app-portal-entity-edit",
  templateUrl: "./entity-edit.html",
})
export class EntityEditComponent implements OnInit, OnDestroy, OnChanges {
  @Input()
  target: IEntityEdit;

  @Input()
  context: ICompileContext;

  @Input()
  parents: string[] = [];

  @Input()
  parent!: IComponentChildDefine;

  @Output()
  onComplete = new EventEmitter<IEntityEditResult>();

  @Output()
  onValid = new EventEmitter<boolean>(true);

  public entity!: IEntityContext;
  public entities!: IEntity[];
  public attaches!: any[];
  public scope: IScope = {};

  constructor(private builder: Builder, private message: NzMessageService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: import("@angular/core").SimpleChanges): void {
    for (const key in changes) {
      if (changes.hasOwnProperty(key)) {
        const element = changes[key];
        if (key === "target") {
          this.initContext(element.currentValue);
        }
      }
    }
  }

  ngOnDestroy(): void {
    const { entityId, data } = this.entity;
    this.clearData(data);
    this.formatData(data);
    const { inputs } = data;
    this.onComplete.emit({
      id: this.target.id,
      parentId: this.parent?.id,
      updateId: entityId,
      module: this.target.module,
      name: this.target.name,
      type: this.target.type,
      version: this.target.version,
      input: inputs,
      attach: this.reduceAttaches(),
    });
  }

  isColor(value: string | null) {
    if (typeof value !== "string") return false;
    if (/^#[0-9abcdefABCDEF]{6,8}$/.test(value)) return true;
    if (/^rgb(a?)\([0-9]{1,3},\s*[0-9]{1,3},\s*[0-9]{1,3}(,\s*[0-9]{1,3})?\);?$/.test(value)) return true;
    return false;
  }

  onModelChange(data: any) {
    const valid = this.entities.findIndex(i => i.id === data) < 0;
    this.onValid.emit(valid);
    if (!valid) {
      this.message.error("Invalid params.");
    }
  }

  addMapEntry(model: IDisplayInput) {
    const value = this.entity.data.inputs[model.displayInfo.fullname].value;
    const keys = model.type.mapInfo.key;
    if (Array.isArray(keys) && keys.length > 0) {
      for (const willKey of keys) {
        if ((<any[]>value).findIndex((i: any) => i[0] === willKey) >= 0) {
          continue;
        }
        (<any[]>value).push([willKey, null]);
        break;
      }
    }
    if (typeof keys === "function" || typeof keys === "string") {
      (<any[]>value).push([null, null]);
    }
    // console.log(model, this.entity.data.inputs[model.displayInfo.fullname]);
  }

  removeMapEntry(model: IDisplayInput, index: number) {
    const value = this.entity.data.inputs[model.displayInfo.fullname].value;
    (<any[]>value).splice(index, 1);
  }

  clearNumberValue(model: IDisplayInput) {
    this.entity.data.inputs[model.displayInfo.fullname].value = null;
  }

  tryGetEntityDecos(id: string): string[] {
    const found = this.entities.find(i => i.id === id)!;
    const exist = this.getComponentByRef(found.ref);
    return <string[]>Object.entries(exist.metadata.observers.observables).map(([, v]) => v);
  }

  onSelectorChange(data: IDataInput) {
    if (!data.value[0] || data.value[0] === null) return;
    data.refObservables = this.tryGetEntityDecos(data.value[0]);
    if (!data.refObservables.includes(data.value[1])) {
      data.value[1] = null;
    }
  }

  private initContext(model: IEntityEdit) {
    this.setContextEntities(model);
    this.setParentAttaches(model);
    this.entity = createDefaultEntity();
    this.entity.displayName = model.displayName || model.name;
    this.entity.idVersion = `${model.module}/${model.name}@${model.version}`;
    this.entity.attaches = Object.entries(model.metadata.attaches).map(([, d]) => d);
    const groups: Record<string, IGroup> = {
      default: {
        name: "default",
        children: [],
        displayInfo: {
          displayName: "Default",
        },
      },
    };
    Object.entries(model.metadata.groups).forEach(
      ([name, group]) =>
        (groups[name] = {
          name: group.name.value,
          children: [],
          displayInfo: {
            displayName: createDisplayName(group),
          },
        }),
    );
    Object.entries(model.metadata.inputs).forEach(([, d]) => {
      const groupName = d.group || "default";
      const fullname = `${d.group || "default"}.${d.name.value}`;
      const propertyPath = !d.group ? d.name.value : `${d.group}.${d.name.value}`;
      this.initItemNgModel(fullname, propertyPath, model, d);
      groups[groupName].children.push({
        ...d,
        displayInfo: {
          displayName: createDisplayName(d),
          fullname: fullname,
        },
      });
    });
    this.entity.inputs = Object.entries(groups).map(([, g]) => g);
    this.entity.entityId = model.id;
    this.entity.init = true;
  }

  private reduceAttaches(): Record<string, any> {
    return (this.attaches ?? [])
      .filter(i => i.value !== null)
      .reduce((p, c) => ({ ...p, [c.define.name.value]: c.value }), {});
  }

  private setContextEntities(model: IEntityEdit) {
    this.entities = this.readlAllEntities().filter(i => i.id !== model.id);
  }

  private setParentAttaches(model: IEntityEdit) {
    if (!this.parent) return;
    const parentComp = this.getComponentByRef(this.parent.ref);
    if (!parentComp) return;
    this.attaches = [];
    const entries = Object.entries(parentComp.metadata.attaches);
    for (const [key, item] of entries) {
      const attach = { define: item, value: null };
      const found = this.parent.attach?.[key]?.expression.find((i: any) => i.id === model.id);
      if (found) {
        attach.value = found.value;
      }
      this.attaches.push(attach);
    }
  }

  private getComponentByRef(ref: string) {
    const component = (this.context.components || []).find(i => i.id === ref)!;
    return this.builder.getComponent(component.module, component.name)!;
  }

  private initItemNgModel(fullname: string, propertyPath: string, model: IEntityEdit, d: IInputDefine) {
    const ngModel: IDataInput = (this.entity.data.inputs[fullname] = {
      define: d,
      value: null,
      type: d.type.meta,
    });
    const forkData: any = cloneDeep(model.source || {});
    const source = get(forkData.input, propertyPath, null);
    if (this.isLiteralValueMode(d)) {
      return this.useLiteralValue(ngModel, source, d);
    }
    if (this.isLiteralMapMode(d)) {
      return this.useLiteralMap(ngModel, source, d);
    }
    if (this.isLiteralEnumsMode(d)) {
      return this.useLiteralEnums(ngModel, source, d);
    }
    if (this.isEntityRefObservable(d)) {
      return this.useEntityRefObservable(ngModel, source);
    }
  }

  private isLiteralEnumsMode(d: IInputDefine) {
    return d.type.expressionType === "literal" && d.type.meta === "enums";
  }

  private isLiteralMapMode(d: IInputDefine) {
    return d.type.expressionType === "literal" && d.type.meta === "map";
  }

  private isLiteralValueMode(d: IInputDefine) {
    return (
      d.type.expressionType === "literal" &&
      (d.type.meta === "string" || d.type.meta === "number" || d.type.meta === "boolean")
    );
  }

  private isEntityRefObservable(d: IInputDefine) {
    return d.type.expressionType === "entityRef" && d.type.entityRefType === "observable";
  }

  private useLiteralValue(model: IDataInput, value: any, d: IInputDefine) {
    model.type = "literal-" + d.type.meta;
    model.value = value === null ? null : value.expression;
  }

  private useLiteralMap(model: IDataInput, value: any, d: IInputDefine) {
    model.type = "literal-map";
    model.value = value === null ? [] : value.expression;
    const keys = d.type.mapInfo.key;
    model.selectList = false;
    if (Array.isArray(keys)) {
      model.typeCheck = v => keys.includes(v);
      model.selectList = true;
    }
    if (typeof keys === "function") {
      model.typeCheck = v => keys(v);
    }
    if (typeof keys === "string") {
      model.typeCheck = v => typeof v === "string";
    }
  }

  private useLiteralEnums(model: IDataInput, value: any, d: IInputDefine) {
    model.type = "literal-enums";
    model.value = value === null ? DEFAULT_ENUM_VALUE : value.expression;
    const keys = d.type.enumsInfo;
    model.selectList = false;
    const otherOptions =
      typeof keys === "function" ? [] : Array.isArray(keys) ? keys.map(k => ({ key: k, value: k })) : keys.allowValues;
    model.enumValues = [{ key: DEFAULT_ENUM_VALUE_LABEL, value: DEFAULT_ENUM_VALUE }, ...otherOptions];
    if (Array.isArray(keys)) {
      model.typeCheck = (v: any) => keys.includes(v);
      model.selectList = true;
    }
  }

  private useEntityRefObservable(model: IDataInput, value: any) {
    model.type = "entyti-ref-observable";
    model.value = value === null ? [null, null] : [value.expression.ref, value.expression.expression];
    this.onSelectorChange(model);
  }

  private readlAllEntities(target: IComponentChildDefine | IDirectiveChildDefine = this.context.page!) {
    const list: any[] = [];
    const hack = <IComponentChildDefine>target;
    list.push(target);
    for (const iterator of hack?.children || []) {
      list.push(...this.readlAllEntities(iterator));
    }
    for (const iterator of hack?.directives || []) {
      list.push(...this.readlAllEntities(iterator));
    }
    return list;
  }

  private clearData(data: { inputs: Record<string, IDataInput> }) {
    for (const key in data.inputs) {
      if (data.inputs.hasOwnProperty(key)) {
        const element = data.inputs[key];
        if (element.type.startsWith("literal")) {
          if (element.type === "literal-string" || element.type === "literal-number") {
            if (element.value === null) {
              delete data.inputs[key];
            }
            continue;
          } else if (element.type === "literal-map") {
            if (Array.isArray(element.value)) {
              if (element.value.length === 0) {
                delete data.inputs[key];
              }
              element.value = element.value.filter(i => i[1] !== null);
            }
            continue;
          } else if (element.type === "literal-enums") {
            if (element.value === DEFAULT_ENUM_VALUE) {
              delete data.inputs[key];
            }
          }
        }
      }
    }
  }

  private formatData(data: { inputs: Record<string, IDataInput> }) {
    const newInputs: Record<string, any> = {};
    for (const key in data.inputs) {
      if (data.inputs.hasOwnProperty(key)) {
        const element = data.inputs[key];
        const [group, realKey] = key.split(".");
        console.log([group, realKey, element.value]);
        if (group !== "default" && !newInputs[group]) newInputs[group] = {};
        const container = group === "default" ? newInputs : newInputs[group];
        container[realKey] = {
          type: element.define.type.expressionType,
          expression: element.value,
        };
        if (this.isEntityRefObservable(element.define)) {
          container[realKey].expression = {
            type: "observable",
            ref: element.value[0],
            expression: element.value[1],
          };
        }
      }
    }
    data.inputs = newInputs;
  }
}

function createDisplayName(d: IInputDefine | IGroupDefine) {
  return d.name.displayValue !== d.name.value && !!d.name.displayValue
    ? `${d.name.displayValue} (${d.name.value})`
    : d.name.value;
}

function createDefaultEntity(): IEntityContext {
  return {
    init: false,
    entityId: "undefined",
    displayName: "",
    idVersion: "",
    inputs: [],
    attaches: [],
    data: {
      inputs: {},
    },
  };
}
