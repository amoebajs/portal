import * as path from "path";
import { Injectable } from "@nestjs/common";
import { Connection, ConnectionOptions, createConnection } from "typeorm";
import { Configs } from "#services/configs";
import { Subject } from "rxjs";

export function createOrmOptions(
  user: string,
  password: string | number,
  database: string,
  host: string,
  port: number,
  synchronize: boolean,
): ConnectionOptions {
  return {
    username: user,
    password: String(password),
    database,
    host,
    port,
    type: "mysql",
    synchronize,
    logging: false,
    entities: [path.resolve(__dirname, "..", "..", "database", "entity", "*{.ts,.js}")],
  };
}

@Injectable()
export class DbConnection {
  protected _connection!: Connection;

  public readonly connected = new Subject<Connection>();

  protected get connection() {
    if (!this._connection) {
      throw new Error("Invalid operation: mysql's connection is not ready");
    }
    return this._connection;
  }

  constructor(private readonly configs: Configs) {
    this.configs.config.subscribe(async configs => {
      const mysql = configs.mysql;
      this._connection = await createConnection(
        createOrmOptions(mysql.user, mysql.password, mysql.database, mysql.host, mysql.port, mysql.synchronize),
      );
      this.connected.next(this._connection);
    });
  }
}
