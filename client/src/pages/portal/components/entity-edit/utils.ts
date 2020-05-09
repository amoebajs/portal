import { IGroupDefine, IInputDefine } from "../../services/builder.service";
import { IEntityContext } from "./typings";

export function createDisplayName(d: IInputDefine | IGroupDefine) {
  return d.name.displayValue !== d.name.value && !!d.name.displayValue
    ? `${d.name.displayValue} (${d.name.value})`
    : d.name.value;
}

export function createDefaultEntity(): IEntityContext {
  return {
    init: false,
    entityId: "undefined",
    displayName: "",
    idVersion: "",
    inputs: [],
    attaches: [],
    data: {
      inputs: {},
    },
  };
}
