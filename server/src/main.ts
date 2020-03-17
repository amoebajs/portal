import path from "path";
import { resolveYamlFile } from "#utils/yaml";
import { IServerConfigs } from "#global/services/config.service";

const ENV = process.env.NODE_ENV === "production" ? "prod" : "dev";

async function load() {
  const { configs } = await resolveYamlFile(
    path.resolve(__dirname, "configs", ENV === "prod" ? "config.yaml" : "config.dev.yaml"),
  );
  const CONF: IServerConfigs = configs;
  if (CONF.cluster.maxCpuNum !== null) {
    process.env.MAX_CPU_NUM = String(CONF.cluster.maxCpuNum);
  }
  process.env.EWS__CONFIGS__PASS = JSON.stringify(configs);
  switch (CONF.startMode) {
    case "mysql":
      require("./app.mysql");
      break;
    case "cluster":
      require("./app.cluster");
      break;
    default:
      require("./app");
      break;
  }
}

load();
