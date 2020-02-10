const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const dockerJson = require("../docker");

const args = process.argv.slice(2);

const yarn = /^win/.test(process.platform) ? "yarn.cmd" : "yarn";

const lastVersion = dockerJson.version || "0.0.1";
const dockerName = dockerJson.name || "demo";

let version = updateVersion(lastVersion);
let quick = false;
for (const argv of args) {
  if (argv.startsWith("-v=") || argv.startsWith("--version=")) {
    version = updateVersion(lastVersion, argv.split("=")[1]);
    continue;
  }
  if (argv.startsWith("-q=") || argv.startsWith("--quick=")) {
    quick = argv.split("=")[1] === "true";
    continue;
  }
}

function updateVersion(oldV, newV) {
  const isPreVersion = (newV || oldV).indexOf("-") > 0;
  if (isPreVersion) {
    let [p, r] = (newV || oldV).split("-");
    let [rp, rv] = r.split(".");
    let nrv = Number(rv || 0);
    nrv += 1;
    return [p, [rp, nrv].join(".")].join("-");
  } else {
    let [a, b, c] = (newV || oldV).split(".");
    let nc = Number(c);
    if (!newV) nc += 1;
    return [a, b, nc].join(".");
  }
}

function runSync(command, args) {
  return spawnSync(command, args, {
    env: process.env,
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    stdio: ["pipe", process.stdout, process.stderr],
  });
}

if (!quick) {
  runSync(yarn, ["install:all"]);
  runSync(yarn, ["build:client"]);
}

const command = "docker";
const params = ["build", "-t", `${dockerName}:${version}`, "."];

console.log("$ " + command + " " + params.join(" "));

runSync(command, params);

console.log("Update Docker Configs --> ");

const dockerJsonPath = path.resolve(__dirname, "..", "docker.json");
const newDockerJsonString = JSON.stringify({ ...dockerJson, version }, null, "  ");

fs.writeFileSync(dockerJsonPath, newDockerJsonString, { flag: "w+", encoding: "utf8" });

console.log(newDockerJsonString);
