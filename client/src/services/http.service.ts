import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ENV } from "../env";

export interface IHttpOptions {
  headers?: {
    [header: string]: string | string[];
  };
  params?: {
    [param: string]: string | string[];
  };
}

export interface IXHROptions extends IHttpOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
}

@Injectable()
export class HttpService {
  constructor(private client: HttpClient) {}

  public async get<T = any>(url: string, queries: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.ajax<T>(url, queries, { ...options, method: "GET" });
  }

  public async post<T = any>(url: string, body: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.ajax<T>(url, body, { ...options, method: "POST" });
  }

  public async put<T = any>(url: string, body: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.ajax<T>(url, body, { ...options, method: "PUT" });
  }

  public async delete<T = any>(url: string, queries: { [prop: string]: any } = {}, options: IHttpOptions = {}) {
    return this.ajax<T>(url, queries, { ...options, method: "DELETE" });
  }

  private resolveSuccess(resp: any) {
    const code = resp && resp.code;
    const message = (resp.data && resp.data.errorMsg) || "Unknown Error";
    return code !== 0 && code !== 200
      ? Promise.reject({ message: `Status: ${code || 500}, Message: ${message}` })
      : Promise.resolve(resp && resp.data);
  }

  private resolveError(resp: any) {
    const error = (resp && resp.error) || {};
    if (error.message) return Promise.reject(error.message);
    return Promise.reject(resp.message);
  }

  private processQueries(queries: { [prop: string]: any } = {}) {
    const qrs = Object.keys(queries)
      .map(name => `${name}=${encodeURIComponent(queries[name])}`)
      .join("&");
    return qrs.length > 0 ? "?" + qrs : "";
  }

  private async ajax<T>(url: string, data: { [prop: string]: any } = {}, options: IXHROptions = {}): Promise<T> {
    const method = options.method || "GET";
    let observer: Observable<T>;
    const xhrOpt = { withCredentials: true, ...options };
    const pathPre = `${ENV.server.api}/${url}`;
    switch (method) {
      case "PUT":
        observer = this.client.put<T>(pathPre, data, xhrOpt);
        break;
      case "POST":
        observer = this.client.post<T>(pathPre, data, xhrOpt);
        break;
      case "DELETE":
        observer = this.client.delete<T>(`${pathPre}${this.processQueries(data)}`, xhrOpt);
        break;
      default:
        observer = this.client.get<T>(`${pathPre}${this.processQueries(data)}`, xhrOpt);
        break;
    }
    return observer
      .toPromise()
      .then((resp: any) => this.resolveSuccess(resp))
      .catch(resp => this.resolveError(resp));
  }
}
