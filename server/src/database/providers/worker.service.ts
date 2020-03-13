import omit from "lodash/omit";
import { Injectable } from "@nestjs/common";
import { createConnection, getManager, Connection } from "typeorm";
import { BehaviorSubject } from "rxjs";
import {
  TaskWorker,
  ITaskRegisterOptions,
  ITaskUpdateOptions,
  ITask,
  TaskStatus,
} from "#global/services/worker.service";
import { ConfigService } from "#global/services/config.service";
import { CompileTask } from "../entity/task.entity";
import { createOrmOptions } from "../ormconfig";

@Injectable()
export class MysqlWorker implements TaskWorker {
  public get id() {
    return process.pid;
  }

  protected get repo() {
    return getManager().getRepository(CompileTask);
  }

  public readonly active = new BehaviorSubject(false);

  private connection!: Connection;

  constructor(private configs: ConfigService) {
    if (!this.active.getValue()) {
      this.configs.onConfigLoad.subscribe(loaded => {
        if (loaded) this.initWorker();
      });
    }
  }

  private async initWorker() {
    const configs = this.configs.getConfig();
    const mysql = configs.mysql;
    this.connection = await createConnection(
      createOrmOptions(mysql.user, mysql.password, mysql.database, mysql.host, mysql.port),
    );
    this.active.next(true);
  }

  private async queryTask(name: string) {
    const all = await this.repo.find({ name });
    if (all.length !== 0) {
      return void 0;
    }
    return all[0];
  }

  public async registerTask(name: string, options: ITaskRegisterOptions): Promise<boolean> {
    const task = await this.queryTask(name);
    if (!task) {
      await this.repo.insert({
        name,
        status: TaskStatus.Pending,
        creator: String(this.id),
        operator: String(this.id),
        data: JSON.stringify(options.data || {}),
      });
      return true;
    }
    return false;
  }

  public async updateTask(name: string, options: ITaskUpdateOptions): Promise<boolean> {
    const task = await this.queryTask(name);
    if (!task) {
      return false;
    }
    const updates: Partial<CompileTask> = {
      operator: String(this.id),
    };
    if (options.data !== void 0) {
      updates.data = JSON.stringify(options.data || {});
    }
    const result = await this.repo.update({ id: task.id }, updates);
    return result.affected > 0;
  }

  public async queryTaskStatus(name: string): Promise<ITask | undefined> {
    const task = await this.queryTask(name);
    if (!task) {
      return void 0;
    }
    return {
      ...omit(task, "id", "data", "createAt", "updateAt"),
      data: JSON.parse(task.data || "{}"),
    };
  }

  public async runTask(name: string): Promise<boolean> {
    const task = await this.queryTask(name);
    if (!task) {
      return false;
    }
    const result = await this.repo.update({ id: task.id, status: TaskStatus.Pending }, { status: TaskStatus.Running });
    return result.affected > 0;
  }

  public async finishTask(name: string): Promise<boolean> {
    const task = await this.queryTask(name);
    if (!task) {
      return false;
    }
    const result = await this.repo.update({ id: task.id, status: TaskStatus.Running }, { status: TaskStatus.Done });
    return result.affected > 0;
  }
}
