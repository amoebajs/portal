import cluster from "cluster";
import os from "os";

const MAXCPU_ENV = Number(process.env.MAX_CPU_NUM);
const MAXCPU = Number.isNaN(MAXCPU_ENV) ? void 0 : MAXCPU_ENV;

process.env.START_MODE = "mysql";

function bootstrap() {
  if (cluster.isMaster) {
    const maxCpuCount = MAXCPU ?? os.cpus().length;
    for (let i = 0; i < maxCpuCount; i++) {
      cluster.fork();
      cluster.on("listening", (worker, address) => {
        console.log(`listening worker ${worker.process.pid} on port ${address.port}`);
      });
      cluster.on("exit", (worker, code, signal) => {
        const workerId = worker.process.pid;
        console.log(`exit worker ${workerId} with code ${code} signal ${signal}`);
        cluster.fork();
      });
      return;
    }
  }
  import("./app");
}

bootstrap();
