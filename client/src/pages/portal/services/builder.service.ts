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
  slot?: string;
}

export interface ICompileContext {
  provider: "react";
  components?: IComponentDefine[];
  directives?: IDirectiveDefine[];
  page?: IPageDefine;
}

type IModuleEntry = import("@amoebajs/builder").IModuleEntry;
type IMapEntry = import("@amoebajs/builder").IMapEntry;

export interface ISourceModule extends IModuleEntry {}

export interface ICompileModule extends Omit<ISourceModule, "components" | "directives"> {
  components: IImportDeclaration[];
  directives: IImportDeclaration[];
}

export type ICompileTypeMeta = "string" | "number" | "map" | "enums" | "onject";

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

@Injectable()
export class Builder {
  private _init = false;
  private _initing = false;
  private _loaded = false;

  private factory!: import("@amoebajs/builder/index.websdk").Factory;
  public SDK!: typeof import("@amoebajs/builder/index.websdk");
  public Utils!: typeof import("@amoebajs/builder/index.websdk").Utils;
  public builder!: import("@amoebajs/builder").Builder;
  public moduleList: ICompileModule[] = [];

  private readonly _onLoad = new BehaviorSubject<boolean | Error>(this._loaded);
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
      const element = document.createElement("script");
      element.type = "text/javascript";
      element.src = "ews-server-websdk.js";
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
    this.factory = new (<any>window).EwsBuilderFactory().parse();
    this.Utils = (<any>window).AmoebajsBuilderUtils;
    this.SDK = (<any>window).AmoebajsBuilderSdk;
    this.builder = this.factory.builder;
    const modules = this.builder["globalMap"].maps.modules;
    Object.entries<ISourceModule>(modules).forEach(([name, md]) => {
      const components = Object.entries(md.components).map(([, cp]) => cp);
      const directives = Object.entries(md.directives).map(([, cp]) => cp);
      this.moduleList.push({ ...md, components, directives });
    });
  }

  public getComponent(module: string, name: string): IImportDeclaration {
    return this.builder["globalMap"].getComponent(module, name);
  }

  public getDirective(module: string, name: string): IImportDeclaration {
    return this.builder["globalMap"].getDirective(module, name);
  }
}
