import cluster from "cluster";
import { Master } from "../clusters/core";

const MAXCPU_ENV = Number(process.env.MAX_CPU_NUM);
const MAXCPU = Number.isNaN(MAXCPU_ENV) ? void 0 : MAXCPU_ENV;

process.env.START_MODE = "cluster";

function bootstrap() {
  if (cluster.isMaster) {
    Master.Create(cluster, { maxWorker: MAXCPU, useTaskMgr: true });
    return;
  }
  require("./app");
}

bootstrap();
