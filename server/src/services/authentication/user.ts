import { Injectable, Scope } from "@nestjs/common";
import { createToken } from "#utils/di";

export interface IUserInfos<I, R, T> {
  logined: boolean;
  id: I;
  name: string;
  account: string;
  roles: R[];
  extends: T;
}

type IgnoreKeys<TARGET, KEYS> = Exclude<keyof TARGET, KEYS>;

type ExcludeExtendsKey<TARGET extends any> = {
  [key in IgnoreKeys<TARGET, "extends">]: TARGET[key];
};

export function getUserDelegate<U extends UserService<any>>(user: U) {
  const delegate = {
    setLogined(logined: boolean) {
      user["setLogined"](logined);
      return delegate;
    },
    setUserId(id: U["infos"]["id"]) {
      user["setUserId"](id);
      return delegate;
    },
    setUserName(name: U["infos"]["name"]) {
      user["setUserName"](name);
      return delegate;
    },
    setUserAccount(account: U["infos"]["account"]) {
      user["setUserAccount"](account);
      return delegate;
    },
    setUserRoles(roles: U["infos"]["roles"]) {
      user["setUserRoles"](roles);
      return delegate;
    },
    setExtendInfos(data: any) {
      user["setExtendInfos"](data);
      return delegate;
    },
  };
  return delegate;
}

@Injectable({ scope: Scope.REQUEST })
export class UserService<
  I extends string | number = number,
  R extends any = string,
  T extends { [prop: string]: any } = {}
> {
  protected _infos: IUserInfos<I, R, T> = {
    logined: false,
    id: <I>0,
    name: "",
    account: "",
    roles: [],
    extends: <T>{},
  };

  public get infos(): T & ExcludeExtendsKey<IUserInfos<I, R, T>> {
    const { extends: more, ...others } = this._infos;
    return {
      ...more,
      ...others,
    };
  }

  protected setLogined(logined: boolean) {
    this._infos.logined = logined;
    return this;
  }

  protected setUserName(name: string) {
    this._infos.name = name;
    return this;
  }

  protected setUserAccount(account: string) {
    this._infos.account = account;
    return this;
  }

  protected setUserId(id: I) {
    this._infos.id = id;
    return this;
  }

  protected setUserRoles(roles: R[]) {
    this._infos.roles = [...roles];
    return this;
  }

  protected setExtendInfos(data: T) {
    this._infos.extends = data;
    return this;
  }
}

export type User = UserService<number | string, string, {}>;
export const User = createToken<User>(UserService);
