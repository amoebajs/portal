import { IBootstrapOptions, bootstrap as base, useStaticAssets, useCORS, useTemplateEngine } from "./bootstrap.prod";

export async function bootstrap(options: Partial<IBootstrapOptions> = {}) {
  return base({
    ...options,
    staticOptions: { maxAge: 0 },
    beforeListen: app => {
      useTemplateEngine(app, { noCache: true });
      useStaticAssets(app, { maxAge: 0 });
      useCORS(app, {
        origin: [/http:localhost:[0-9]{1,5}/, /http:\/\/127\.0\.0\.1:[0-9]{1,5}/],
        credentials: true,
      });
    },
  });
}
