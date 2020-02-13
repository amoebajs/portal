export interface IConstructor<T> {
  new (...args: any[]): T;
  prototype: T;
}

export interface IAbstractType<T> {
  prototype: T;
}

export type InjectToken<T> = IConstructor<T> | IAbstractType<T>;
