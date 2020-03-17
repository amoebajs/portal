import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";

export interface IPage {
  id: number | string;
  versionId: number | string;
  name: string;
  displayName: string;
  description: string;
  creator: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompileTask {
  id: number | string;
  pageId: number | string;
  versionId: number | string;
  status: TaskStatus;
  name: string;
  creator: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageVersion {
  id: number | string;
  pageId: number | string;
  creator: string;
  data: string;
  dist: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  Pending = 0,
  Running = 1,
  Failed = 2,
  Done = 3,
}

export interface IListQueryResult<T> {
  items: T[];
  current: number;
  size: number;
  total: number;
}

export interface IPageListQueryOptions {
  name?: string;
  creator?: string;
  current: number;
  size: number;
}

export interface ITaskListQueryOptions {
  name?: string;
  pageId?: string;
  creator?: string;
  current: number;
  size: number;
}

export interface IVersionListQueryOptions {
  name?: string;
  pageId?: string;
  creator?: string;
  current: number;
  size: number;
}

export interface IPageQueryOptions {
  id?: number | string;
  name?: string;
}

export interface IPageCreateUpdateOptions {
  id?: number | string;
  versionId?: string;
  name?: string;
  displayName?: string;
  operator?: string;
}

export interface ITaskQueryResult {
  success: boolean;
  data?: any;
}

export interface ITaskStartOptions {
  name: string;
  displayName?: string;
  data?: any;
  operator: string;
}

export interface ITaskQueryOptions {
  id: number | string;
}

export interface ITaskEndOptions {
  id: number | string;
  operator: string;
  status?: TaskStatus;
}

export interface IVersionCreateUpdateOptions {
  id?: number | string;
  pageId?: string | number;
  operator?: string;
  dist?: string;
  data?: string;
}

export interface IVersionQueryOptions {
  id: string | number;
  name?: string;
}

@Injectable()
export abstract class TaskWorker {
  public abstract active: Observable<boolean>;
  public abstract id: any;
  public abstract queryPageList(options: IPageListQueryOptions): Promise<IListQueryResult<IPage>>;
  public abstract queryTaskList(options: ITaskListQueryOptions): Promise<IListQueryResult<ICompileTask>>;
  public abstract queryVersionList(options: IVersionListQueryOptions): Promise<IListQueryResult<IPageVersion>>;
  public abstract createUpdatePage(options: IPageCreateUpdateOptions): Promise<unknown>;
  public abstract createUpdateVersion(options: IVersionCreateUpdateOptions): Promise<unknown>;
  public abstract queryPage(options: IPageQueryOptions): Promise<IPage>;
  public abstract queryVersion(options: IVersionQueryOptions): Promise<IPageVersion>;
  public abstract startTask(options: ITaskStartOptions): Promise<string>;
  public abstract queryTask(options: ITaskQueryOptions): Promise<ICompileTask>;
  public abstract endTask(options: ITaskEndOptions): Promise<boolean>;
}
