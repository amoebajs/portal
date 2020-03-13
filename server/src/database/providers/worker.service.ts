import { Injectable } from "@nestjs/common";
import { createConnection, getManager, Connection } from "typeorm";
import { BehaviorSubject } from "rxjs";
import { TaskWorker } from "#global/services/worker.service";
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

  public async registerTask(task: string, options: any): Promise<any> {
    const all = await this.repo.find({ name: task });
    if (all.length !== 0) {
      throw new Error("task exist");
    }
    return this.repo.insert({ name: task, storage: JSON.stringify(options || {}) });
  }

  public updateTask(task: string, options: any): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public queryTaskStatus(task: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public runTask(task: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public finishTask(task: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
