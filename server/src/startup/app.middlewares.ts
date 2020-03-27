import { NestExpressApplication } from "@nestjs/platform-express";
import { AppIndexRedirect } from "#middlewares/app-index";

export function useMiddlewares(app: NestExpressApplication) {
  app.use([AppIndexRedirect]);
}
