import { Injectable } from "@nestjs/common";
import { BehaviorSubject } from "rxjs";
import { cloneDeep } from "lodash";
import { CompressionOptions } from "compression";

export interface IServerConfigs {
  name: string;
  envMode: "dev" | "prod";
  uriGroup: {
    portal: { uri: string; token: string; type: string };
    site: { uri: string; token: string; type: string };
    api: { uri: string; token: string; type: string };
  };
  startMode: "redis" | "mysql" | "cluster" | "app";
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
export class ConfigService {
  private _config!: IServerConfigs;
  private _env: { [prop: string]: string } = {};

  public readonly onEnvLoad = new BehaviorSubject(false);
  public readonly onConfigLoad = new BehaviorSubject(false);

  public setConfig(config: IServerConfigs) {
    this._config = cloneDeep(config);
    this.onConfigLoad.next(true);
    return this;
  }

  public setEnv(env: { [prop: string]: string }) {
    this._env = env;
    this.onEnvLoad.next(true);
    return this;
  }

  public getConfig() {
    return this._config;
  }

  public getEnv() {
    return this._env;
  }
}
