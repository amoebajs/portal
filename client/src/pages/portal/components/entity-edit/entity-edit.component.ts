import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output } from "@angular/core";
import {
  Builder,
  ICompileContext,
  ICompileTypeMeta,
  IComponentChildDefine,
  IDirectiveChildDefine,
  IGroupDefine,
  IInputDefine,
} from "../../services/builder.service";
import { IEntityCreate } from "../module-list/module-list.component";

interface IDataInput {
  value: number | string | [any, any][] | null;
  type: ICompileTypeMeta;
  selectList?: boolean;
  enumValues?: { key: string | number; value: any }[];
  typeCheck?: (v: any) => boolean;
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
  source?: IComponentChildDefine | IDirectiveChildDefine;
}

export interface IEntityEditResult {
  id: string;
  updateId: string;
  module: string;
  name: string;
  type: "component" | "directive" | "composition";
  version: string | number;
  input: Record<string, any>;
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

  @Output()
  onComplete = new EventEmitter<IEntityEditResult>();

  public entity!: IEntityContext;
  public scope: IScope = {};

  constructor(private builder: Builder) {}

  ngOnInit(): void {
    this.initContext(this.target);
  }

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
      updateId: entityId,
      module: this.target.module,
      name: this.target.name,
      type: this.target.type,
      version: this.target.version,
      input: inputs,
    });
  }

  isColor(value: string | null) {
    if (typeof value !== "string") return false;
    if (/^#[0-9abcdefABCDEF]{6,8}$/.test(value)) return true;
    if (/^rgb(a?)\([0-9]{1,3},\s*[0-9]{1,3},\s*[0-9]{1,3}(,\s*[0-9]{1,3})?\);?$/.test(value)) return true;
    return false;
  }

  onModelChange() {
    // console.log(this.entity.data);
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

  private initContext(model: IEntityEdit) {
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

  private initItemNgModel(fullname: string, propertyPath: string, model: IEntityEdit, d: IInputDefine) {
    const ngModel: IDataInput = (this.entity.data.inputs[fullname] = {
      value: null,
      type: d.type.meta,
    });
    const forkData: any = cloneDeep(model.source || {});
    const sourceValue = get(forkData.input, propertyPath, null);
    if (d.type.meta === "string" || d.type.meta === "number" || d.type.meta === "boolean") {
      ngModel.value = sourceValue === null ? null : sourceValue.expression;
    } else if (d.type.meta === "map") {
      ngModel.value = sourceValue === null ? [] : sourceValue.expression;
      const keys = d.type.mapInfo.key;
      ngModel.selectList = false;
      if (Array.isArray(keys)) {
        ngModel.typeCheck = v => keys.includes(v);
        ngModel.selectList = true;
      }
      if (typeof keys === "function") {
        ngModel.typeCheck = v => keys(v);
      }
      if (typeof keys === "string") {
        ngModel.typeCheck = v => typeof v === "string";
      }
    } else if (d.type.meta === "enums") {
      ngModel.value = sourceValue === null ? DEFAULT_ENUM_VALUE : sourceValue.expression;
      const keys = d.type.enumsInfo;
      ngModel.selectList = false;
      const otherOptions = keys.map(k => ({ key: k, value: k }));
      ngModel.enumValues = [{ key: DEFAULT_ENUM_VALUE_LABEL, value: DEFAULT_ENUM_VALUE }, ...otherOptions];
      if (Array.isArray(keys)) {
        ngModel.typeCheck = (v: any) => keys.includes(v);
        ngModel.selectList = true;
      }
    }
  }

  private clearData(data: { inputs: Record<string, IDataInput> }) {
    for (const key in data.inputs) {
      if (data.inputs.hasOwnProperty(key)) {
        const element = data.inputs[key];
        if (element.type === "string" || element.type === "number") {
          if (element.value === null) {
            delete data.inputs[key];
          }
          continue;
        } else if (element.type === "map") {
          if (Array.isArray(element.value)) {
            if (element.value.length === 0) {
              delete data.inputs[key];
            }
            element.value = element.value.filter(i => i[1] !== null);
          }
          continue;
        } else if (element.type === "enums") {
          if (element.value === DEFAULT_ENUM_VALUE) {
            delete data.inputs[key];
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
        if (!newInputs[group]) newInputs[group] = {};
        (group === "default" ? newInputs : newInputs[group])[realKey] = {
          type: "literal",
          expression: element.value,
        };
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
