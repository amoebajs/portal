import cluster from "cluster";
import os from "os";
import {
  IWorkActiveReceiveMsg,
  IWorkRegisterTaskCompletedReceiveMsg,
  IWorkerFinishTaskReceiveMsg,
  IWorkerQueryTaskReceiveMsg,
  IWorkerRunTaskReceiveMsg,
  IWorkerSendMsg,
  IWorkerUpdateTaskReceiveMsg,
  IWorkerUpdateTaskSendMsg,
} from "../../typings/message";
import { Task, TaskManager } from "./task";

export interface IMasterOptions {
  maxWorker?: number;
  useTaskMgr?: boolean;
}

/**
 * ## Master 主机
 */
export class Master<T extends IWorkerSendMsg = IWorkerSendMsg> extends TaskManager {
  public static Create(god: typeof cluster, options: IMasterOptions = {}) {
    return new Master(god, options);
  }

  private _target = process;
  private _useMgr = false;
  private _maxNum = os.cpus().length;
  private _workers: number[] = [];

  constructor(private _god: typeof cluster, options: IMasterOptions = {}) {
    super();
    this.init(options);
  }

  protected init(options: IMasterOptions) {
    this.initOptions(options);
    this.initWorkers();
    this.onWorkerListening();
    this.onWorkerExit();
    this.onWorkerMessagereceived();
  }

  protected initWorkers() {
    for (let i = 0; i < this._maxNum; i++) {
      this._god.fork();
    }
  }

  protected initOptions(options: IMasterOptions) {
    if (options.maxWorker !== void 0) {
      this._maxNum = options.maxWorker;
    }
    if (options.useTaskMgr !== void 0) {
      this._useMgr = options.useTaskMgr === true;
    }
  }

  protected onWorkerMessagereceived() {
    if (!this._useMgr) return;
    this._god.on("message", (worker, message: any = {}) => {
      this.onMessageReceived(message, worker);
    });
  }

  protected onWorkerExit() {
    this._god.on("exit", (worker, code, signal) => {
      const workerId = worker.process.pid;
      console.log("exit worker " + workerId + " died");
      if (this._useMgr) {
        this._removeWorker(worker);
        this._clearTasksForCurrentWorker(workerId);
      }
      this._god.fork();
    });
  }

  protected onWorkerListening() {
    this._god.on("listening", (worker, address) => {
      console.log("listening: worker " + worker.process.pid);
    });
  }

  protected onMessageReceived(data: T, worker: cluster.Worker) {
    const message: IWorkerSendMsg = data;
    switch (message.type) {
      case "init":
        this._addWorker(worker);
        break;
      case "register-task":
        this._createTask(message.taskid, message.infos, message.autoreset, message.storage, worker);
        break;
      case "query-task":
        this._queryTask(message.taskid, worker);
        break;
      case "run-task":
        this._runTask(message.taskid, worker);
        break;
      case "finish-task":
        this._finishTask(message.taskid, worker);
        break;
      case "update-task":
        this._updateTask(message.taskid, message.changes, worker);
        break;
      default:
        break;
    }
  }

  protected send<D>(worker: cluster.Worker, data: D) {
    return worker.send(data);
  }

  private _addWorker(worker: cluster.Worker) {
    this._workers.push(worker.process.pid);
    this.send<IWorkActiveReceiveMsg>(worker, {
      type: "active",
      master: this._target.pid,
    });
  }

  private _removeWorker(worker: cluster.Worker) {
    this._workers = this._workers.filter(i => i !== worker.process.pid);
  }

  private _createTask(id: string, infos: any, autorestart: boolean, storage: string | false, worker: cluster.Worker) {
    this.send<IWorkRegisterTaskCompletedReceiveMsg>(worker, {
      type: "register-completed",
      exist: this._createNewTask(id, infos, autorestart, storage, worker.process.pid),
      taskid: id,
    });
  }

  private _queryTask(id: string, worker: cluster.Worker) {
    const [exist, task, storage] = this._queryTaskExist(id);
    this.send<IWorkerQueryTaskReceiveMsg>(worker, {
      type: "query-task-result",
      exist: !!exist,
      snapshot: { ...(task?.getTaskSnapshot() || {}), storage },
      taskid: id,
    });
  }

  private _runTask(taskid: string, worker: cluster.Worker) {
    const [success, hasControl] = this._runExistTask(taskid, worker.process.pid);
    this.send<IWorkerRunTaskReceiveMsg>(worker, {
      type: "run-task-result",
      control: hasControl,
      success,
      taskid,
    });
  }

  private _updateTask(taskid: string, changes: IWorkerUpdateTaskSendMsg["changes"], worker: cluster.Worker) {
    this.send<IWorkerUpdateTaskReceiveMsg>(worker, {
      type: "update-task-result",
      success: this._updateExisttask(taskid, changes),
      taskid,
    });
  }

  private _finishTask(taskid: string, worker: cluster.Worker) {
    const success = this._finishTheTask(taskid, worker.process.pid, task => this._clearFinishedTask(task));
    this.send<IWorkerFinishTaskReceiveMsg>(worker, {
      type: "finish-task-result",
      success,
      taskid,
    });
  }

  private _clearTasksForCurrentWorker(workerId: number) {
    Array.from(this._tasks.values())
      .filter(i => i.operator === workerId)
      .forEach(task => {
        task.finishTask(task.operator);
        this._clearFinishedTask(task);
      });
  }

  private _clearFinishedTask(task: Task) {
    if (!task.autoReset) {
      this._clearFinishedTaskAction(task);
    } else {
      // 随机重新分配执行节点
      const random = Math.floor(Math.random() * 1000);
      const index = random % this._maxNum;
      this._resetFinishedTaskAction(task, this._workers[index]);
    }
  }
}
