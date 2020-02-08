const webpack = require("webpack");
const chalk = require("chalk");
const { spawn } = require("child_process");
const config = require("../webpack.config");

function createrPlugin() {
  const buildingStatus = {
    percent: "0",
    stamp: null,
  };
  return new webpack.ProgressPlugin((percentage, msg) => {
    const percent = (percentage * 100).toFixed(2);
    const stamp = new Date().getTime();
    if (buildingStatus.percent === percent) return;
    if (buildingStatus.stamp === null) {
      buildingStatus.stamp = new Date().getTime();
    }
    const usage = stamp - buildingStatus.stamp;
    buildingStatus.percent = percent;
    console.log(`[${(usage / 1000).toFixed(2)}s] ${chalk.green(buildingStatus.percent + "%")} ${msg}`);
    if (percent === "100.00") {
      buildingStatus.stamp = null;
      console.log(chalk.blue("[webpack] compile successfully\n"));
    }
  });
}

webpack({ ...config, plugins: [...config.plugins, createrPlugin()] }, (err, stats) => {
  if (err) {
    throw err;
  }
  if (stats.hasErrors()) {
    throw new Error(stats.toString());
  }
  spawn("tsc", ["-p", "tsconfig.websdk.json"], {
    env: process.env,
    cwd: process.cwd(),
    stdio: ["pipe", process.stdout, process.stderr],
  });
});
