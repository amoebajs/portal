import { Injectable } from "@nestjs/common";
import { IGlobalMap, IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { ICompileTask } from "#app/services/core-compile.service";
import { createToken } from "#utils/di";

export enum TaskType {
  CommonPageBuild = 1,
  PreviewEnvironBuild = 2,
}

export interface ICommonBuildConfigs {
  name: string;
  options: IPageCreateOptions;
}

export interface ISourceCreateResult {
  source: string;
  dependencies: Record<string, string>;
}

@Injectable()
export abstract class CompileService<T> {
  public abstract getTemplateGroup(): IGlobalMap;
  public abstract queryPageUri(name: string): string | null;
  public abstract createTask(type: TaskType.PreviewEnvironBuild, configs: {}): Promise<string>;
  public abstract createTask(type: TaskType.CommonPageBuild, configs: ICommonBuildConfigs): Promise<string>;
  public abstract createSourceString(
    configs: IPageCreateOptions,
    transpile?: Partial<ISourceCreateTranspileOptions>,
  ): Promise<ISourceCreateResult>;
  public abstract queryTask(id: string): Promise<T | null>;
}

export type Compiler = CompileService<ICompileTask>;
export const Compiler = createToken<Compiler>(CompileService);
