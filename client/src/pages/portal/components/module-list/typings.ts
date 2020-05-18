import { ICompileModule, IImportDeclaration } from "../../services/builder.service";

export interface IEntityCreate {
  id: string;
  type: "component" | "directive" | "composition";
  module: string;
  name: string;
  displayName: string | null;
  version: string | number;
  metadata: IImportDeclaration["metadata"];
}

export interface IDisplayImport extends IImportDeclaration {
  displayInfo: { displayName: string };
}

export interface IDisplayModule extends Omit<ICompileModule, "components" | "directives" | "compositions"> {
  components: IDisplayImport[];
  directives: IDisplayImport[];
  compositions: IDisplayImport[];
  displayInfo: {
    displayName: string;
    expanded: boolean;
  };
}
