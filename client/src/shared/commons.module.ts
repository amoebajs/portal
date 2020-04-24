import { NgModule } from "@angular/core";
import {
  NzButtonModule,
  NzDropDownModule,
  NzIconModule,
  NzInputModule,
  NzInputNumberModule,
  NzLayoutModule,
  NzMessageModule,
  NzModalModule,
  NzNotificationModule,
  NzResultModule,
  NzSelectModule,
  NzSwitchModule,
  NzTableModule,
  NzTabsModule,
} from "ng-zorro-antd";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { JsonStringifyPipe } from "./pipes/json.pipe";
import { DateTimePipe } from "./pipes/datetime.pipe";

@NgModule({
  declarations: [JsonStringifyPipe, DateTimePipe],
  exports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzLayoutModule,
    NzInputNumberModule,
    NzSelectModule,
    NzSwitchModule,
    NzModalModule,
    NzResultModule,
    NzTabsModule,
    NzTableModule,
    NzIconModule,
    NzMessageModule,
    NzDropDownModule,
    NzNotificationModule,
    JsonStringifyPipe,
    DateTimePipe,
  ],
})
export class CommonsModule {}
