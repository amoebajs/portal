import * as BuilderSdk from "@amoebajs/builder/index.websdk";
import { CommonModule, LayoutModule, ZentModule } from "@amoebajs/basic-modules";
import { BuilderFactory } from "./index";

declare global {
  interface Window {
    EwsContext: EwsWindow;
  }
}

export interface EwsWindow {
  BuilderSdk: typeof BuilderSdk;
  BuilderUtils: typeof BuilderSdk.Utils;
  BuilderFactory: typeof BuilderFactory;
  ExposedModules: {
    CommonModule: typeof CommonModule;
    LayoutModule: typeof LayoutModule;
    ZentModule: typeof ZentModule;
  };
}

const context: EwsWindow = {
  BuilderSdk,
  BuilderFactory,
  BuilderUtils: BuilderSdk.Utils,
  ExposedModules: {
    CommonModule,
    LayoutModule,
    ZentModule,
  },
};

export { BuilderFactory, CommonModule, LayoutModule, ZentModule };

window.EwsContext = context;
