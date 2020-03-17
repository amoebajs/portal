import * as path from "path";
import { ConnectionOptions } from "typeorm";

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
    entities: [path.resolve(__dirname, "entity", "*{.ts,.js}")],
  };
}
