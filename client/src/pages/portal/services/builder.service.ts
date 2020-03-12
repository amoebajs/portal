import { Injectable } from "@angular/core";
import { Subject, BehaviorSubject } from "rxjs";

export interface IDirectiveDefine {
  module: string;
  name: string;
  id: string;
  version: string | number;
}

export interface IComponentDefine extends IDirectiveDefine {}

export interface IDirectiveChildDefine {
  ref: string;
  id: string;
  input?: { [name: string]: any };
}

export interface IComponentChildDefine extends IDirectiveChildDefine {
  children?: IComponentChildDefine[];
  directives?: IDirectiveChildDefine[];
  attach?: { [name: string]: any };
  props?: { [name: string]: any };
}

export interface IPageDefine extends IComponentChildDefine {
  compositions?: IDirectiveChildDefine[];
  slot?: string;
}

export interface ICompileContext {
  provider: "react";
  components?: IComponentDefine[];
  directives?: IDirectiveDefine[];
  compositions?: IDirectiveDefine[];
  page?: IPageDefine;
}

type IModuleEntry = import("@amoebajs/builder").IModuleEntry;
type IMapEntry = import("@amoebajs/builder").IMapEntry;

export interface ISourceModule extends IModuleEntry {}

export interface ICompileModule extends Omit<ISourceModule, "components" | "directives" | "compositions"> {
  components: IImportDeclaration[];
  directives: IImportDeclaration[];
  compositions: IImportDeclaration[];
}

export type ICompileTypeMeta = "string" | "number" | "boolean" | "map" | "enums" | "onject";

export interface IInputDefine {
  realName: string;
  name: {
    value: string;
    displayValue: string;
    i18n: Record<string, string>;
  };
  group: string | null;
  description: string | null;
  type: {
    meta: ICompileTypeMeta;
    enumsInfo: (string | number)[] | null;
    mapInfo: { key: any[] | Function; value: any } | null;
  };
}

export interface IGroupDefine {
  name: {
    value: string;
    displayValue: string | null;
    i18n: Record<string, string>;
  };
  description: {
    value: string | null;
    i18n: Record<string, string>;
  };
}

export interface IEntityDefine {
  name: string;
  version: string | number;
  displayName: string;
  dependencies: Record<string, string>;
  description: string | null;
}

export interface IImportDeclaration extends IMapEntry {}

declare global {
  interface Window {
    EwsContext: import("#websdk").EwsWindow;
  }
}

@Injectable()
export class Builder {
  private _initing = false;

  private factory!: import("#websdk").BuilderFactory;
  public SDK!: typeof import("@amoebajs/builder");
  public Utils!: typeof import("@amoebajs/builder").Utils;
  public builder!: import("@amoebajs/builder").Builder;
  public moduleList: ICompileModule[] = [];

  private readonly _onLoad = new BehaviorSubject<boolean | Error>(false);
  public readonly onLoad = this._onLoad.asObservable();

  private readonly _onLoadError = new Subject<Error>();
  public readonly onLoadError = this._onLoadError.asObservable();

  constructor() {
    this.loadServerWebsdk()
      .then(() => console.log("loaded"))
      .catch(error => console.log(error));
  }

  public async loadServerWebsdk() {
    this._initing = true;
    return new Promise((resolve, reject) => {
      const ewsGlobal = (<any>window).EWS_Global;
      const element = document.createElement("script");
      element.type = "text/javascript";
      element.src = "ews-server-websdk.js";
      // 生产环境支持hash
      if (ewsGlobal) {
        element.src = `ews-server-websdk.${ewsGlobal.projectHash}.js`;
      }
      element.onload = () => {
        this._initing = false;
        this.initBuilder();
        this._onLoad.next(true);
        resolve();
      };
      element.onerror = error => {
        this._initing = false;
        this._onLoadError.next(new Error("load websdk failed"));
        reject(error);
      };
      setTimeout(() => {
        document.body.appendChild(element);
      }, 500);
    });
  }

  private initBuilder() {
    this.factory = new window.EwsContext.BuilderFactory().parse();
    this.Utils = window.EwsContext.BuilderUtils;
    this.SDK = window.EwsContext.BuilderSdk;
    this.builder = this.factory.builder;
    const modules = this.builder["globalMap"].maps.modules;
    console.log(modules);
    Object.entries<ISourceModule>(modules).forEach(([name, md]) => {
      const components = Object.entries(md.components).map(([, cp]) => cp);
      const directives = Object.entries(md.directives).map(([, cp]) => cp);
      const compositions = Object.entries(md.compositions).map(([, cp]) => cp);
      this.moduleList.push({ ...md, components, directives, compositions });
    });
    console.log(this.moduleList);
  }

  public getComponent(module: string, name: string): IImportDeclaration {
    return this.builder["globalMap"].getComponent(module, name);
  }

  public getDirective(module: string, name: string): IImportDeclaration {
    return this.builder["globalMap"].getDirective(module, name);
  }

  public getComposition(module: string, name: string): IImportDeclaration {
    return this.builder["globalMap"].getComposition(module, name);
  }

  public async createSource(configs: import("@amoebajs/builder").IPageCreateOptions) {
    if (!this._onLoad.getValue()) throw new Error("websdk has not been loaded.");
    return this.builder.createSource({
      configs,
      prettier: false,
      transpile: {
        module: "es2015",
        target: "es2015",
        enabled: true,
        jsx: "react",
      },
    });
  }
}
