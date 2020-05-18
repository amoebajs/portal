import { Factory } from "@amoebajs/builder";
import { CommonModule, CompositionModule, LayoutModule } from "@amoebajs/basic-modules";
import { ZentModule } from "@amoebajs/zent-ui";

export class BuilderFactory extends Factory {
  protected initModules() {
    super.initModules();
    this.useModule(CommonModule);
    this.useModule(LayoutModule);
    this.useModule(CompositionModule);
    this.useModule(ZentModule);
  }
}
