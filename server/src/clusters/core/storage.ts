export class ClusterStorage<T extends { [prop: string]: any } = {}> {
  private _data: T = <T>{};

  public get data() {
    return { ...this._data };
  }

  public get name() {
    return this._name;
  }

  constructor(private _name: string) {}

  public updateStorage(data: Partial<T>, force = false) {
    if (force) {
      this._data = <T>data;
    } else {
      this._data = {
        ...this._data,
        ...data,
      };
    }
    return this;
  }
}
