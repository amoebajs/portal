import { Injectable } from "@nestjs/common";
import { IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { createToken } from "#utils/di";
import { ICompileTask } from "#database/typings";

export enum TaskType {
  CommonPageBuild = 1,
  PreviewEnvironBuild = 2,
}

export interface ICommonBuildConfigs {
  name: string;
  options: IPageCreateOptions;
  creator: string;
}

export interface ISourceCreateResult {
  source: string;
  dependencies: Record<string, string>;
}

@Injectable()
export abstract class CompileService<T> {
  public abstract async queryPageUri(name: string): Promise<string>;
  public abstract createTask(configs: ICommonBuildConfigs): Promise<string | number>;
  public abstract createSourceString(
    configs: IPageCreateOptions,
    transpile?: Partial<ISourceCreateTranspileOptions>,
  ): Promise<ISourceCreateResult>;
  public abstract queryTask(id: string): Promise<T | null>;
}

export type Compiler = CompileService<ICompileTask>;
export const Compiler = createToken<Compiler>(CompileService);
