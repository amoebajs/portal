import { NestExpressApplication } from "@nestjs/platform-express";
import { AppIndexRedirect } from "#middlewares/app-index";
import { RequestLogger } from "#middlewares/req-logger";

export function useMiddlewares(app: NestExpressApplication) {
  app.use(RequestLogger);
  app.use(AppIndexRedirect);
}
