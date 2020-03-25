import { Injectable } from "@nestjs/common";
import { IPageCreateOptions, ISourceCreateTranspileOptions } from "@amoebajs/builder";
import { createToken } from "#utils/di";
import { ICompileTask } from "#typings/page";

export enum TaskType {
  CommonPageBuild = 1,
  PreviewEnvironBuild = 2,
}

export interface ICommonBuildConfigs {
  name: string;
  displayName?: string;
  description?: string;
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
  public abstract async createCompileTask(configs: ICommonBuildConfigs): Promise<string | number>;
  public abstract async createSourceString(
    configs: IPageCreateOptions,
    transpile?: Partial<ISourceCreateTranspileOptions>,
  ): Promise<ISourceCreateResult>;
  public abstract async queryCompileTask(id: string | number): Promise<T>;
  public abstract async queryCompileTaskLogs(id: string | number): Promise<string>;
}

export type Compiler = CompileService<ICompileTask>;
export const Compiler = createToken<Compiler>(CompileService);
