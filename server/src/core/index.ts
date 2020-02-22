import { Factory } from "@amoebajs/builder";
import { CommonModule, LayoutModule, CompositionModule, ZentModule } from "@amoebajs/basic-modules";

export class BuilderFactory extends Factory {
  protected initModules() {
    super.initModules();
    this.useModule(CommonModule);
    this.useModule(LayoutModule);
    this.useModule(CompositionModule);
    this.useModule(ZentModule);
  }
}
