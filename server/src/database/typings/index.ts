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
  description?: string;
  configs?: string;
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
