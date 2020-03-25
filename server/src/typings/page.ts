export interface IPage {
  id: number | string;
  configId: number | string;
  versionId: number | string;
  status: PageStatus;
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
  configId: number | string;
  versionId: number | string;
  status: TaskStatus;
  name: string;
  description: string;
  logs: string;
  creator: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageVersion {
  id: number | string;
  configId: number | string;
  pageId: number | string;
  taskId: number | string;
  creator: string;
  dist: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPageConfig {
  id: number | string;
  name: string;
  pageId: number | string;
  creator: string;
  data: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDistStorage {
  id: number | string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  Pending = 0,
  Running = 1,
  Failed = 2,
  Done = 3,
}

export enum PageStatus {
  Changed = 0,
  Normal = 1,
}

export interface IListQueryResult<T> {
  items: T[];
  current: number;
  size: number;
  total: number;
}
