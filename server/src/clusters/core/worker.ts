import { ITaskSnapshot, Task, TaskManager } from "./task";
import {
  IWorkActiveReceiveMsg,
  IWorkRegisterTaskCompletedReceiveMsg,
  IWorkerFinishTaskReceiveMsg,
  IWorkerFinishTaskSendMsg,
  IWorkerInitSendMsg,
  IWorkerQueryTaskReceiveMsg,
  IWorkerQueryTaskSendMsg,
  IWorkerReceiveMsg,
  IWorkerRegisterTaskSendMsg,
  IWorkerRunTaskReceiveMsg,
  IWorkerRunTaskSendMsg,
  IWorkerUpdateTaskReceiveMsg,
  IWorkerUpdateTaskSendMsg,
  IWorkerSendMsg,
} from "./message";
import { ClusterStorage } from "./storage";

const FakeRels: Record<IWorkerSendMsg["type"], IWorkerReceiveMsg["type"]> = {
  init: "active",
  "register-task": "register-completed",
  "query-task": "query-task-result",
  "run-task": "run-task-result",
  "update-task": "update-task-result",
  "finish-task": "finish-task-result",
};

/**
 * ## Worker 执行节点
 */
export class Worker<T extends IWorkerReceiveMsg = IWorkerReceiveMsg> extends TaskManager {
  public static Create() {
    return new Worker();
  }

  private _target = process;
  private _parent: number = -1;
  private _init: boolean = false;
  private _onActiveFn: () => void = () => {};
  private _registerList: [string, (exist: boolean) => void][] = [];
  private _queryList: [string, (exist: boolean, snapshot: ITaskSnapshot<any>) => void][] = [];
  private _runList: [string, (sucess: boolean, control: boolean) => void][] = [];
  private _updateList: [string, (sucess: boolean) => void][] = [];
  private _finishList: [string, (sucess: boolean) => void][] = [];

  public get isActive() {
    return this._init;
  }

  public get id() {
    return this._target.pid;
  }

  public get hasMaster() {
    return "send" in this._target;
  }

  constructor() {
    super();
    this.initWorker();
  }

  protected initWorker() {
    this.onWorkerMessageReceived();
    this.send<IWorkerInitSendMsg>({ type: "init" });
  }

  protected onWorkerMessageReceived() {
    this._target.on("message", (data: any = {}) => this.onMessageReceived(data));
  }

  public onActive(onActive: () => void) {
    this._onActiveFn = onActive;
  }

  public registerTask(
    taskid: string,
    options: {
      data?: any;
      autoReset?: boolean;
      storage?: string;
    },
  ) {
    this.send<IWorkerRegisterTaskSendMsg>({
      type: "register-task",
      taskid,
      infos: options.data || {},
      autoreset: options.autoReset || false,
      storage: !options.storage ? false : options.storage,
    });
    return new Promise<void>((resolve, reject) => {
      this._registerList.push([taskid, exist => (exist ? reject() : resolve())]);
    });
  }

  public queryTaskStatus<T = any>(taskid: string) {
    this.send<IWorkerQueryTaskSendMsg>({
      type: "query-task",
      taskid,
    });
    return new Promise<ITaskSnapshot<T>>((resolve, reject) => {
      this._queryList.push([taskid, (exist, snapshot) => (exist ? resolve(snapshot) : reject())]);
    });
  }

  public runTask(taskid: string) {
    this.send<IWorkerRunTaskSendMsg>({
      type: "run-task",
      taskid,
    });
    return new Promise<boolean>((resolve, reject) => {
      this._runList.push([taskid, (success, control) => (success ? resolve(control) : reject())]);
    });
  }

  public updateTask(
    taskid: string,
    kvs: {
      delete?: string[];
      insert?: [string, any][];
      update?: [string, any][];
    },
  ) {
    const { delete: del = [], insert = [], update = [] } = kvs;
    this.send<IWorkerUpdateTaskSendMsg>({
      type: "update-task",
      taskid,
      changes: {
        insert,
        update,
        delete: del,
      },
    });
    return new Promise<boolean>((resolve, reject) => {
      this._updateList.push([taskid, success => (success ? resolve() : reject())]);
    });
  }

  public finishTask(taskid: string) {
    this.send<IWorkerFinishTaskSendMsg>({
      type: "finish-task",
      taskid,
    });
    return new Promise<void>((resolve, reject) => {
      this._finishList.push([taskid, success => (success ? resolve() : reject())]);
    });
  }

  protected onMessageReceived(data: T) {
    const message: IWorkerReceiveMsg = data;
    switch (message.type) {
      case "active":
        this.resolveOnActive(message);
        break;
      case "register-completed":
        this.resolveTaskRegister(message);
        break;
      case "query-task-result":
        this.resolveQueryTask(message);
        break;
      case "run-task-result":
        this.resolveRunTask(message);
        break;
      case "finish-task-result":
        this.resolveFinishTask(message);
        break;
      case "update-task-result":
        this.resolveUpdateTask(message);
        break;
      default:
        break;
    }
  }

  protected onMessageReceivedMock<D extends IWorkerSendMsg>(data: D) {
    const sendType = data.type;
    const type = FakeRels[sendType];
    switch (type) {
      case "active":
        this.resolveOnActive({ type, master: null });
        break;
      case "register-completed":
        const { taskid: createid, infos, autoreset, storage } = <IWorkerRegisterTaskSendMsg>data;
        const exist = this._createNewTask(createid, infos, autoreset, storage, this._target.pid);
        this.resolveTaskRegister({ type, exist, taskid: createid });
        break;
      case "query-task-result":
        const { taskid: queryid } = <IWorkerQueryTaskSendMsg>data;
        const [isExist, task, s] = this._queryTaskExist(queryid);
        this.resolveQueryTask({
          type,
          exist: isExist,
          taskid: queryid,
          snapshot: { ...(task?.getTaskSnapshot() || {}), storage: s },
        });
        break;
      case "run-task-result":
        const { taskid: runid } = <IWorkerRunTaskSendMsg>data;
        const [success, hasControl] = this._runExistTask(runid, this._target.pid);
        this.resolveRunTask({ type, success, control: hasControl, taskid: runid });
        break;
      case "finish-task-result":
        const { taskid: finishid } = <IWorkerFinishTaskSendMsg>data;
        this.resolveFinishTask({
          type,
          taskid: finishid,
          success: this._finishTheTask(finishid, this._target.pid, task => this._clearFinishedTask(task)),
        });
        break;
      case "update-task-result":
        const { taskid: updateid, changes } = <IWorkerUpdateTaskSendMsg>data;
        this.resolveUpdateTask({ type, taskid: updateid, success: this._updateExisttask(updateid, changes) });
        break;
      default:
        break;
    }
  }

  protected send<D extends IWorkerSendMsg>(data: D) {
    if (this.hasMaster) {
      return this._target.send(data);
    } else {
      setImmediate(() => this.onMessageReceivedMock(data));
      return true;
    }
  }

  private resolveOnActive(data: IWorkActiveReceiveMsg) {
    this._parent = data.master;
    this._onActiveFn();
  }

  private resolveQueryTask(data: IWorkerQueryTaskReceiveMsg) {
    this._queryList.filter(i => i[0] === data.taskid).forEach(task => task[1](data.exist, data.snapshot));
  }

  private resolveTaskRegister(data: IWorkRegisterTaskCompletedReceiveMsg) {
    this._registerList.filter(i => i[0] === data.taskid).forEach(task => task[1](data.exist));
  }

  private resolveRunTask(data: IWorkerRunTaskReceiveMsg) {
    this._runList.filter(i => i[0] === data.taskid).forEach(task => task[1](data.success, data.control));
  }

  private resolveUpdateTask(data: IWorkerUpdateTaskReceiveMsg) {
    this._updateList.filter(i => i[0] === data.taskid).forEach(task => task[1](data.success));
  }

  private resolveFinishTask(data: IWorkerFinishTaskReceiveMsg) {
    this._finishList.filter(i => i[0] === data.taskid).forEach(task => task[1](data.success));
  }

  private _clearFinishedTask(task: Task) {
    if (!task.autoReset) {
      this._clearFinishedTaskAction(task);
    } else {
      this._resetFinishedTaskAction(task, this._target.pid);
    }
  }
}
