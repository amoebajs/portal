import path from "path";
import { resolveYamlFile } from "#utils/yaml";
import { IServerConfigs } from "#global/services/config.service";

const ENV = process.env.NODE_ENV === "production" ? "prod" : "dev";

async function load() {
  const { configs } = await resolveYamlFile(
    path.resolve(__dirname, "configs", ENV === "prod" ? "config.yaml" : "config.dev.yaml"),
  );
  process.env.EWS__CONFIGS__PASS = JSON.stringify(configs);
  const CONF: IServerConfigs = configs;
  switch (CONF.startMode) {
    case "mysql":
      require("./app.mysql");
    case "cluster":
      if (CONF.cluster.maxCpuNum !== null) {
        process.env.MAX_CPU_NUM = String(CONF.cluster.maxCpuNum);
      }
      require("./app.cluster");
      break;
    default:
      require("./app");
      break;
  }
}

load();
