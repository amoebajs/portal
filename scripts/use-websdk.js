const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const statsJson = require("../server/dist/src/assets/stats-es2015.json");

function resolvePath(pathname) {
  return path.resolve(__dirname, "..", "server", "dist", "src", "assets", pathname);
}

const context = {
  projectHash: statsJson.hash,
};

const source = resolvePath("ews-server-websdk.js");
const copied = resolvePath(`ews-server-websdk.${statsJson.hash}.js`);

const template = resolvePath("index.html");

const contextList = [
  `\n\t<script type="text/javascript">`,
  "\t\t\t(function(){",
  `\t\t\t\twindow.EWS_Global = ${JSON.stringify(context)}`,
  "\t\t\t})();",
  "\t\t</script>",
];

async function useWebSDK() {
  try {
    await fs.rename(source, copied);
    const data = await fs.readFile(template, { encoding: "utf8" });
    const $ = cheerio.load(data);
    $("app-entry").after(contextList.join("\n"));
    await fs.writeFile(template, $.html(), { encoding: "utf8" });
    await fs.rename(template, resolvePath("client.njk"));
  } catch (error) {
    throw error;
  }
}

useWebSDK();
