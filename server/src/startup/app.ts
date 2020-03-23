type IEnv = "prod" | "dev";

async function start() {
  const ENV: IEnv = process.env.NODE_ENV === "production" ? "prod" : "dev";
  const options: Partial<import("./bootstrap.prod").IBootstrapOptions> = {
    configs: JSON.parse(process.env.EWS__CONFIGS__PASS),
    ewsEnvs: getEnvs(),
  };
  if (ENV === "prod") {
    (await import("./bootstrap.prod")).bootstrap(options);
  } else {
    (await import("./bootstrap.dev")).bootstrap(options);
  }
}

function getEnvs() {
  const envs: { [prop: string]: string } = {};
  for (const key in process.env) {
    if (key.startsWith("EWS_") && process.env.hasOwnProperty(key)) {
      envs[key.slice(4)] = process.env[key];
    }
  }
  return envs;
}

start();
