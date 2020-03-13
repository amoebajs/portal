import cluster from "cluster";
import { Master } from "./clusters";

const MAXCPU_ENV = Number(process.env.MAX_CPU_NUM);
const MAXCPU = Number.isNaN(MAXCPU_ENV) ? void 0 : MAXCPU_ENV;

function bootstrap() {
  if (cluster.isMaster) {
    Master.Create(cluster, { maxWorker: MAXCPU });
    return;
  }
  require("./app");
}

bootstrap();
