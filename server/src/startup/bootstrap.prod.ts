import * as path from "path";
import * as nunjucks from "nunjucks";
import compression from "compression";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ServeStaticOptions } from "@nestjs/platform-express/interfaces/serve-static-options.interface";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { Configs, IServerConfigs } from "#services/configs";
import { DbConnection } from "#services/database/connection";
import { useMiddlewares } from "./app.middlewares";
import { MainModule } from "./main.module";

export const ASSETS_ROOT = path.join(__dirname, "..", "assets");
const noopPromise = (app: any) => Promise.resolve(app);

type OnInitHook<T> = (app: T) => void | Promise<void>;

export interface IBootstrapOptions {
  configs: IServerConfigs;
  ewsEnvs: { [prop: string]: string };
  staticOptions: ServeStaticOptions;
  beforeListen: OnInitHook<NestExpressApplication>;
}

export async function bootstrap({
  configs,
  ewsEnvs = {},
  beforeListen: onInit = noopPromise,
  staticOptions = {},
}: Partial<IBootstrapOptions> = {}) {
  const app = await NestFactory.create<NestExpressApplication>(MainModule);
  app
    .get(Configs)
    .setConfig(configs)
    .setEnv(ewsEnvs);
  useStaticAssets(app, staticOptions);
  useGzip(app, configs);
  useTemplateEngine(app);
  useMiddlewares(app);
  await useDbConnection(app);
  await onInit(app);
  app.listen(configs.port);
}

export function useTemplateEngine(app: NestExpressApplication, options: Partial<{ noCache: boolean }> = {}) {
  app.engine("njk", useNunjucks(app, { noCache: false, ...options }).render);
  app.setViewEngine("njk");
}

export function useStaticAssets(app: NestExpressApplication, options: ServeStaticOptions) {
  app.useStaticAssets(ASSETS_ROOT, { maxAge: "30d", ...options });
}

export function useGzip(app: NestExpressApplication, configs: IServerConfigs) {
  const { enabled: useGizp, options: gzipOptions } = configs.gzip;
  if (useGizp) {
    app.use(compression(gzipOptions));
  }
}

export function useCORS(app: NestExpressApplication, options: Partial<CorsOptions> = {}) {
  app.enableCors(options);
}

export function useNunjucks(app: NestExpressApplication, { noCache = false }: { noCache?: boolean } = {}) {
  return nunjucks.configure([ASSETS_ROOT], {
    autoescape: true,
    express: app,
    noCache,
  });
}

export async function useDbConnection(app: NestExpressApplication) {
  return new Promise((resolve, reject) => {
    app.get(DbConnection).connected.subscribe(
      async () => {
        try {
          resolve();
        } catch (error) {
          reject();
        }
      },
      error => reject(error),
    );
  });
}
