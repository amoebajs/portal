import * as BuilderSdk from "@amoebajs/builder/index.websdk";
import { CommonModule, LayoutModule, ZentModule } from "@amoebajs/basic-modules";
import { BuilderFactory } from "./index";

declare global {
  interface EwsWindow {
    AmoebajsBuilderSdk: typeof BuilderSdk;
    AmoebajsBuilderUtils: typeof BuilderSdk.Utils;
    EwsBuilderFactory: typeof BuilderFactory;
    EwsModules: {
      CommonModule: typeof CommonModule;
      LayoutModule: typeof LayoutModule;
      ZentModule: typeof ZentModule;
    };
  }

  interface Window extends EwsWindow {}
}

window.AmoebajsBuilderSdk = BuilderSdk;
window.AmoebajsBuilderUtils = BuilderSdk.Utils;
window.EwsBuilderFactory = BuilderFactory;
window.EwsModules = {
  CommonModule,
  LayoutModule,
  ZentModule,
};
