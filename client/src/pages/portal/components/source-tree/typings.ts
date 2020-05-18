import { IComponentDefine, IDirectiveDefine, IPageDefine } from "../../services/builder.service";

export type IDisplay<T> = T & {
  displayInfo: {
    displayName: string;
    expanded: boolean;
  };
};

export interface ISourceTree {
  components: IDisplay<IComponentDefine>[];
  directives: IDisplay<IDirectiveDefine>[];
  compositions: IDisplay<IDirectiveDefine>[];
  compExpanded: boolean;
  direExpanded: boolean;
  cpsiExpanded: boolean;
  page?: IDisplay<IDisplayEntity>;
}

export interface IDisplayEntity extends IPageDefine {
  children?: IDisplay<IDisplayEntity>[];
  directives?: IDisplay<IDisplayEntity>[];
  compositions?: IDisplay<IDisplayEntity>[];
}

export type XType = "component" | "directive" | "composition";

export interface ICleanPayload {
  type: "c" | "d" | "cs";
  value: any;
}

export interface IPayload {
  ref: string;
  children?: IPayload[];
  directives?: IPayload[];
  root?: boolean;
}
