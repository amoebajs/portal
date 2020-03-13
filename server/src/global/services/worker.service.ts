import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";

export enum TaskStatus {
  Pending = 0,
  Running = 1,
  Failed = 2,
  Done = 3,
}

export interface ITask {
  name: string;
  status: TaskStatus;
  creator: string;
  operator: string;
  data: Record<string, any>;
}

export interface ITaskQueryResult {
  success: boolean;
  data?: any;
}

export interface ITaskRegisterOptions {
  data?: any;
}

export interface ITaskUpdateOptions {
  data?: any;
}

@Injectable()
export abstract class TaskWorker {
  public abstract active: Observable<boolean>;
  public abstract id: any;
  public abstract registerTask(name: string, options: ITaskRegisterOptions): Promise<boolean>;
  public abstract updateTask(name: string, options: ITaskUpdateOptions): Promise<boolean>;
  public abstract queryTaskStatus(name: string): Promise<ITask | undefined>;
  public abstract runTask(name: string): Promise<boolean>;
  public abstract finishTask(name: string): Promise<boolean>;
}
