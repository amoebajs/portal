import { InjectToken } from "./base";

export function createToken<T>(ctor: InjectToken<T>): InjectToken<T> & FunctionConstructor {
  return <any>ctor;
}
