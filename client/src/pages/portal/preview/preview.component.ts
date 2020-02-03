import SDK from "@stackblitz/sdk";
import yamljs from "js-yaml";
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NzMessageService, NzTabChangeEvent } from "ng-zorro-antd";
import { Project } from "@stackblitz/sdk/typings/interfaces";
import { VM } from "@stackblitz/sdk/typings/VM";
import { PortalService } from "../services/portal.service";

@Component({
  selector: "app-portal-preview",
  templateUrl: "./preview.html",
})
export class PortalPreviewComponent implements OnInit, AfterViewInit {
  @ViewChild("previewHost", { static: false }) previewHost: ElementRef;

  public showButton = false;
  public showEditor = true;
  public showPreview = false;
  public pageConfigs = createDefaultConfigs();

  private vm!: VM;
  private project: Project = {
    files: {
      "public/index.html": `<div id="app"></div>`,
      "src/index.js": "",
    },
    dependencies: {
      "@types/react": "^16.9.7",
      zent: "^7.1.0",
      rxjs: "^6.5.4",
      react: "^16.12.0",
      "react-dom": "^16.12.0",
    },
    title: "Preview Page",
    description: "preview page",
    template: "create-react-app",
    tags: [],
    settings: {
      compile: {
        trigger: "save",
        action: "hmr",
        clearConsole: true,
      },
    },
  };

  constructor(private portal: PortalService, private message: NzMessageService) {}

  ngOnInit() {
    console.log(SDK);
  }

  ngAfterViewInit() {
    console.log(this.previewHost);
    this.showButton = true;
  }

  onEditorClick() {
    this.showEditor = !this.showEditor;
  }

  onPreviewClick() {
    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      this.runUpdate();
    }
  }

  private async runUpdate() {
    try {
      const configs = yamljs.safeLoad(this.pageConfigs);
      const result = await this.portal.createSource("json", configs);
      if (this.vm) {
        this.vm.applyFsDiff({
          create: {
            "src/index.js": result.data.source,
          },
          destroy: [],
        });
      } else {
        this.project.files["src/index.js"] = result.data.source;
        this.onStart();
      }
    } catch (error) {
      this.message.error(JSON.stringify(error.toString()));
    }
  }

  onStart() {
    SDK.embedProject(this.previewHost.nativeElement, this.project, {
      hideExplorer: true,
      hideDevTools: true,
      hideNavigation: true,
      forceEmbedLayout: true,
      height: "760px",
      view: "preview",
    }).then(vm => {
      // TODO
      this.vm = vm;
      console.log(vm);
    });
  }

  onTextareaChange(value: string) {
    if (this.showPreview) {
      this.runUpdate();
    }
  }
}

function createDefaultConfigs() {
  return `provider: react
framework:
  sdk: "0.0.1"
components:
  - id: GridLayout
    name: grid-layout
    module: ambjs-layout-module
    version: 0.0.1-beta.0
  - id: StackLayout
    name: stack-layout
    module: ambjs-layout-module
    version: 0.0.1-beta.0
  - id: ZentButton
    name: zent-button
    module: zent-module
    version: "0.0.1"
directives:
  - id: GlobalState
    name: global-state
    module: ambjs-common-module
    version: "0.0.1-beta.0"
  - id: ZentCssImport
    name: zent-base-css
    module: zent-module
    version: "0.0.1"
page:
  ref: GridLayout
  id: GridLayoutPageRoot
  slot: app
  input:
    width:
      type: literal
      expression: 100vw
    height:
      type: literal
      expression: 100vh
    rowCount:
      type: literal
      expression: 2
    columnCount:
      type: literal
      expression: 3
    rowSizes:
      type: literal
      expression:
        - [1, 50]
        - [2, 50]
    columnSizes:
      type: literal
      expression:
        - [1, 30]
        - [2, 40]
        - [3, 30]
  directives:
    - ref: ZentCssImport
      id: ZentCssImportInstance01
    - ref: GlobalState
      id: GlobalStateInstance01
      input:
        name:
          type: literal
          expression: AppContext
        state:
          type: literal
          expression:
            - [demoNumber, 123456]
            - [buttonName, XXXXXXXXXX]
            - [objectState, { "a": 24523, "b": false }]
  children:
    - ref: GridLayout
      id: GridLayoutChild01
      input:
        backgroundColor:
          type: literal
          expression: "#fea500"
        padding:
          type: literal
          expression:
            - [top, 10px]
            - [left, 10px]
            - [right, 10px]
            - [bottom, 10px]
      children:
        - ref: StackLayout
          id: StackLayoutChild01
          input:
            backgroundColor:
              type: literal
              expression: "#888888"
          children:
            - ref: ZentButton
              id: ZentButtonInstance02
              props:
                children:
                  type: literal
                  syntaxType: string
                  expression: BUTTON01
            - ref: ZentButton
              id: ZentButtonInstance03
              props:
                children:
                  type: literal
                  syntaxType: string
                  expression: BUTTON02
                type:
                  type: literal
                  syntaxType: string
                  expression: primary
            - ref: ZentButton
              id: ZentButtonInstance04
              props:
                children:
                  type: literal
                  syntaxType: string
                  expression: BUTTON03
                type:
                  type: literal
                  syntaxType: string
                  expression: danger
    - ref: GridLayout
      id: GridLayoutChild02
      input:
        backgroundColor:
          type: literal
          expression: "#323233"
    - ref: GridLayout
      id: GridLayoutChild03
      input:
        backgroundColor:
          type: literal
          expression: "rgb(254, 38, 76)"
    - ref: GridLayout
      id: GridLayoutChild04
      input:
        backgroundColor:
          type: literal
          expression: "rgb(54, 158, 106)"
      children:
        - ref: ZentButton
          id: ZentButtonInstance01
          props:
            loading:
              type: state
              expression: objectState.b
            children:
              type: state
              expression: buttonName
            size:
              type: literal
              syntaxType: string
              expression: large
            type:
              type: literal
              syntaxType: string
              expression: danger
  attach:
    rowStart:
      type: childRefs
      expression:
        - id: GridLayoutChild01
          value: 1
        - id: GridLayoutChild02
          value: 1
        - id: GridLayoutChild03
          value: 2
        - id: GridLayoutChild04
          value: 2
    columnStart:
      type: childRefs
      expression:
        - id: GridLayoutChild01
          value: 1
        - id: GridLayoutChild02
          value: 2
        - id: GridLayoutChild03
          value: 1
        - id: GridLayoutChild04
          value: 3
    rowSpan:
      type: childRefs
      expression:
        - id: GridLayoutChild01
          value: 1
        - id: GridLayoutChild02
          value: 1
        - id: GridLayoutChild03
          value: 1
        - id: GridLayoutChild04
          value: 1
    columnSpan:
      type: childRefs
      expression:
        - id: GridLayoutChild01
          value: 1
        - id: GridLayoutChild02
          value: 2
        - id: GridLayoutChild03
          value: 2
        - id: GridLayoutChild04
          value: 1`;
}
