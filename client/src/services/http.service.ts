import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ENV } from "../env";

export interface IHttpOptions {
  headers?: {
    [header: string]: string | string[];
  };
  params?: {
    [param: string]: string | string[];
  };
}

function processQueries(queries: { [prop: string]: any } = {}) {
  const qrs = Object.keys(queries)
    .map(name => `${name}=${encodeURIComponent(queries[name])}`)
    .join("&");
  return qrs.length > 0 ? "?" + qrs : "";
}

@Injectable()
export class HttpService {
  constructor(private client: HttpClient) {}

  public get<T = any>(url: string, queries: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.client
      .get<T>(`${ENV.server.api}/${url}${processQueries(queries)}`, { withCredentials: true, ...options })
      .toPromise()
      .then((resp: any) => resp.data);
  }

  public post<T = any>(url: string, body: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.client
      .post<T>(`${ENV.server.api}/${url}`, body, { withCredentials: true, ...options })
      .toPromise()
      .then((resp: any) => resp.data);
  }

  public put<T = any>(url: string, body: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.client
      .put<T>(`${ENV.server.api}/${url}`, body, { withCredentials: true, ...options })
      .toPromise()
      .then((resp: any) => resp.data);
  }

  public delete<T = any>(url: string, queries: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.client
      .delete<T>(`${ENV.server.api}/${url}${processQueries(queries)}`, { withCredentials: true, ...options })
      .toPromise()
      .then((resp: any) => resp.data);
  }
}
