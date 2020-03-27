import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";
import { cloneDeep } from "lodash";
import { CompressionOptions } from "compression";

export interface IServerConfigs {
  name: string;
  envMode: "dev" | "prod";
  port: number;
  uriGroup: {
    portal: { uri: string; token: string; type: string };
    site: { uri: string; token: string; type: string };
    api: { uri: string; token: string; type: string };
  };
  startMode: "redis" | "mysql" | "app";
  redis: { host: string; port: number };
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: number | string;
    synchronize: boolean;
  };
  cluster: { maxCpuNum: number | null };
  gzip: { enabled: boolean; options?: Partial<CompressionOptions> };
}

@Injectable()
export class Configs {
  private _config!: IServerConfigs;
  private _env: Record<string, string> = {};

  public readonly env = new Subject<Record<string, string>>();
  public readonly config = new Subject<IServerConfigs>();

  public setConfig(config: IServerConfigs) {
    this._config = cloneDeep(config);
    this.config.next(this._config);
    return this;
  }

  public setEnv(env: Record<string, string>) {
    this._env = { ...env };
    this.env.next(this._env);
    return this;
  }

  public getConfig() {
    return this._config;
  }

  public getEnv() {
    return this._env;
  }
}
