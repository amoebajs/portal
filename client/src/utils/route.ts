import { Route, Routes } from "@angular/router";

export interface IRouterFn<T extends Record<string, Route>> {
  (comps: Record<keyof T, any>): Routes;
  readonly data: T;
}

export function createRouter<T extends Record<string, Route>>(data: T): IRouterFn<T> {
  const fn = (data2: any) => Object.entries(data).map(i => ({ ...i[1], component: data2[i[0]] || i[1].component }));
  fn.data = data;
  return fn;
}
