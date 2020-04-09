import * as BuilderSdk from "@amoebajs/builder";
import { CommonModule, LayoutModule } from "@amoebajs/basic-modules";
import { ZentModule } from "@amoebajs/zent-ui";
import { BuilderFactory } from "../src/services/compiler/core";

/* eslint-disable @typescript-eslint/interface-name-prefix */

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
