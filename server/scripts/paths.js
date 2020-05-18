const tsConfigPaths = require("tsconfig-paths");
const tsconfig = require("../tsconfig.json");
const baseUrl = "./dist";
tsConfigPaths.register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths,
});
