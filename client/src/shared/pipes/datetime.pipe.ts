import moment from "moment";
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "datetime",
  pure: false,
})
export class DateTimePipe implements PipeTransform {
  transform(value: Date, format = "YYYY-MM-DD HH:mm:ss") {
    return moment(value).format(format);
  }
}
