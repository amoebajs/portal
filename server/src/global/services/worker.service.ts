import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export abstract class TaskWorker {
  public abstract active: Observable<boolean>;
  public abstract id: any;
  public abstract registerTask(task: string, options: any): Promise<any>;
  public abstract updateTask(task: string, options: any): Promise<any>;
  public abstract queryTaskStatus(task: string): Promise<any>;
  public abstract runTask(task: string): Promise<any>;
  public abstract finishTask(task: string): Promise<any>;
}
