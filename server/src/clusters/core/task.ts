import { ClusterStorage } from "./storage";
import { IWorkerUpdateTaskSendMsg } from "../../typings/message";

export interface ITaskSnapshot<T extends { [prop: string]: any } = {}> {
  id: string;
  locked: boolean;
  creator: number;
  operator: number;
  storage: T;
}

export class Task {
  static Create(id: string, creator: number) {
    return new Task(id, creator);
  }

  private _locked: boolean = false;
  private _operator: number = -1;
  private _finished: boolean = false;
  private _storage!: string | undefined;

  public get locked() {
    return this._locked;
  }

  public get finished() {
    return this._finished;
  }

  public get hasStorage() {
    return this._storage !== void 0;
  }

  public get autoReset() {
    return this._autoReset;
  }

  public get id() {
    return this.taskid;
  }

  public get creator() {
    return this._creator;
  }

  public get operator() {
    return this._operator;
  }

  public get storageName() {
    return this._storage;
  }

  constructor(private taskid: string, private _creator: number, private _autoReset = false) {}

  public reset(operator?: number) {
    this._operator = operator === void 0 ? -1 : operator;
    this._finished = false;
    this._locked = false;
  }

  public setStorage(name: string) {
    this._storage = name;
  }

  public getTaskSnapshot(): ITaskSnapshot<{}> {
    return {
      id: this.taskid,
      locked: this._locked,
      creator: this._creator,
      operator: this._operator,
      storage: {},
    };
  }

  public lockTask(operator: number) {
    if (!this._locked) {
      this._locked = true;
      this._operator = operator;
    }
  }

  public finishTask(operator: number) {
    if (this._locked) {
      if (this._operator === operator) {
        this._finished = !this._autoReset;
        return true;
      }
      return false;
    } else {
      this._finished = !this._autoReset;
      return true;
    }
  }
}

export class TaskManager {
  protected _tasks: Map<string, Task> = new Map();
  protected _finished_tasks: Task[] = [];
  protected _storages: Map<string, ClusterStorage<any>> = new Map();

  protected _createNewTask(id: string, infos: any, autorestart: boolean, storage: string | false, workerid: number) {
    let exist = this._tasks.get(id);
    let existed = true;
    if (!exist) {
      existed = false;
      exist = new Task(id, workerid, autorestart);
      if (storage !== false) {
        exist.setStorage(storage);
        const existSto = this._storages.get(storage);
        if (existSto) {
          existSto.updateStorage(infos);
        } else {
          this._storages.set(storage, new ClusterStorage(storage).updateStorage(infos));
        }
      }
      this._tasks.set(id, exist);
    }
    return existed;
  }

  protected _queryTaskExist(id: string): [boolean, Task, any] {
    const exist = this._tasks.get(id);
    if (exist) {
      const sto = this._storages.get(exist.storageName);
      return [true, exist, sto?.data || {}];
    }
    return [false, null, null];
  }

  protected _runExistTask(id: string, workerid: number): [boolean, boolean] {
    const task = this._tasks.get(id);
    let hasControl = false;
    let success = false;
    if (task) {
      success = true;
      if (!task.locked) {
        task.lockTask(workerid);
        hasControl = true;
      }
    }
    return [success, hasControl];
  }

  protected _updateExisttask(id: string, changes: IWorkerUpdateTaskSendMsg["changes"]) {
    const task = this._tasks.get(id);
    let success = false;
    if (task) {
      const existSto = this._storages.get(task.storageName);
      if (existSto) {
        const newData = existSto.data;
        for (const iterator of changes.insert) {
          newData[iterator[0]] = iterator[1];
        }
        for (const iterator of changes.update) {
          newData[iterator[0]] = iterator[1];
        }
        for (const iterator of changes.delete) {
          delete newData[iterator];
        }
        existSto.updateStorage(newData, true);
        success = true;
      }
    }
    return success;
  }

  protected _finishTheTask(id: string, workerid: number, onFinish: (task: Task) => void) {
    const task = this._tasks.get(id);
    let success = false;
    if (task) {
      success = task.finishTask(workerid);
      onFinish(task);
    }
    return success;
  }

  protected _clearFinishedTaskAction(task: Task) {
    this._finished_tasks.push(task);
    this._tasks.delete(task.id);
  }

  protected _resetFinishedTaskAction(task: Task, newWorkerId: number) {
    task.reset(newWorkerId);
  }
}
