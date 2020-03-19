import { NgModule } from "@angular/core";
import { NgZorroAntdModule } from "ng-zorro-antd";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { JsonStringifyPipe } from "./pipes/json.pipe";
import { DateTimePipe } from "./pipes/datetime.pipe";

@NgModule({
  declarations: [JsonStringifyPipe, DateTimePipe],
  exports: [CommonModule, FormsModule, NgZorroAntdModule, JsonStringifyPipe, DateTimePipe],
})
export class CommonsModule {}
