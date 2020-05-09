import { IComponentChildDefine, IDirectiveChildDefine, IInputDefine } from "../../services/builder.service";
import { IEntityCreate } from "../module-list/typings";

export type IEntity = IComponentChildDefine | IDirectiveChildDefine;

export interface IDataInput {
  define: IInputDefine;
  value: number | string | [any, any][] | null;
  type: string;
  selectList?: boolean;
  enumValues?: { key: string | number; value: any }[];
  typeCheck?: (v: any) => boolean;
  refObservables?: string[];
}

export interface IEntityContext {
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

export interface IScope {}

export type IDisplayInput = IInputDefine & {
  displayInfo: {
    displayName: string | null;
    fullname: string;
  };
};

export interface IGroup {
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

export interface IAttachItem {
  define: any;
  value: any;
}
