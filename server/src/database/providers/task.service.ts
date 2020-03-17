import { BaseMysqlService } from "./base.service";
import {
  IListQueryResult,
  ITaskListQueryOptions,
  ITaskQueryOptions,
  TaskStatus,
} from "#global/services/worker.service";
import { CompileTask } from "#database/entity/compile-task.entity";

export interface ICreateOptions {
  pageId: string | number;
  versionId: string | number;
  status: TaskStatus;
  name: string;
  creator: string;
}

export interface IUpdateOptions extends Partial<Omit<ICreateOptions, "creator">> {
  id: number | string;
  creator?: string;
}

export class TaskService extends BaseMysqlService {
  protected get repository() {
    return this.connection.getRepository(CompileTask);
  }

  public async queryTaskList(
    options: ITaskListQueryOptions,
    repo = this.repository,
  ): Promise<IListQueryResult<CompileTask>> {
    return this.invokeListQuery(repo, options);
  }

  public async queryTask(options: ITaskQueryOptions, repo = this.repository): Promise<CompileTask> {
    const queries: Partial<CompileTask> = {};
    if (options.id !== void 0) queries.id = options.id;
    return this.queryEntry(repo, queries);
  }

  public async createTask(options: ICreateOptions, repo = this.repository): Promise<string> {
    return this.createEntry(repo, options);
  }

  public async updateTask(
    options: IUpdateOptions,
    where: (keyof IUpdateOptions)[],
    repo = this.repository,
  ): Promise<boolean> {
    const [w, o] = this.useSkipOmit(options, where);
    return this.updateEntry(repo, w, o);
  }
}
