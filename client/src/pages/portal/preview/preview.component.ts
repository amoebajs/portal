import SDK from "@stackblitz/sdk";
import yamljs from "js-yaml";
import debounce from "lodash/debounce";
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, TemplateRef, Renderer2 } from "@angular/core";
import { NzMessageService } from "ng-zorro-antd";
import { Project } from "@stackblitz/sdk/typings/interfaces";
import { VM } from "@stackblitz/sdk/typings/VM";
import { PortalService } from "../services/portal.service";
import { ICompileContext, Builder } from "../services/builder.service";
import { callContextValidation } from "../components/source-tree/source-tree.component";

const CommonDepts = {
  "@types/react": "^16.9.7",
  rxjs: "^6.5.4",
};

@Component({
  selector: "app-portal-preview",
  templateUrl: "./preview.html",
})
export class PortalPreviewComponent implements OnInit, AfterViewInit {
  @ViewChild("previewRender", { static: false }) previewRender: ElementRef;
  @ViewChild("previewTpl", { static: false }) previewTpl: TemplateRef<HTMLDivElement>;

  public showButton = false;
  public showEditor: "view" | "config" | "hide" = "view";
  public showPreview = {
    edit: true,
    preview: false,
  };

  public lastDepts: Record<string, string> = {};
  public createContext = createDefaultConfigs();
  public pageConfigs = yamljs.safeDump(this.createContext);
  public vm!: VM;

  private project: Project = {
    files: {
      "public/index.html": `<div id="app"></div>`,
      "src/index.js": "",
    },
    dependencies: {},
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

  public get lastDeptKvs() {
    return Object.entries(this.lastDepts);
  }

  constructor(
    private renderer: Renderer2,
    private portal: PortalService,
    private builder: Builder,
    private message: NzMessageService,
  ) {
    this.onTextareaChange = debounce(this.onTextareaChange.bind(this), 500);
  }

  ngOnInit() {
    // console.log(this.builder.moduleList);
  }

  ngAfterViewInit() {
    this.showButton = true;
  }

  onEditorClick(value: any) {
    if (value === "config") {
      this.pageConfigs = yamljs.safeDump(this.createContext);
    }
    this.showEditor = value;
  }

  onPreviewClick(target: any) {
    this.showPreview[target] = !this.showPreview[target];
    this.trackPreviewIfNeed();
  }

  onPreviewSaveClick() {}

  onTextareaChange(value: string) {
    try {
      const newValue = yamljs.safeLoad(value);
      console.log(newValue);
      console.log(JSON.stringify(newValue, null, "  "));
      this.createContext = callContextValidation(newValue);
      this.trackPreviewIfNeed();
    } catch (error) {
      console.log(error);
    }
  }

  onContextChange(context: any) {
    this.createContext = context;
    // console.log(context);
    this.trackPreviewIfNeed();
  }

  private async runUpdate(confs?: any) {
    try {
      const configs = confs || this.createContext;
      // const result = await this.portal.createSource(configs);
      // 使用websdk构建源代码，脱离服务器构建
      const result = await this.builder.createSource(configs);
      console.log(result.sourceCode);
      const hasDeptsChange = this.checkIfAllEqual(result.dependencies);
      if (this.vm && hasDeptsChange) {
        this.vm.applyFsDiff({
          create: {
            "src/index.js": result.sourceCode,
          },
          destroy: [],
        });
      } else {
        const firstChild = this.previewRender.nativeElement.childNodes[0];
        if (firstChild) {
          this.renderer.removeChild(this.previewRender.nativeElement, firstChild);
          this.vm = null;
        }
        this.project.files["src/index.js"] = result.sourceCode;
        this.lastDepts = { ...result.dependencies };
        this.project.dependencies = {
          ...CommonDepts,
          ...result.dependencies,
        };
        this.onStart();
      }
    } catch (error) {
      console.log(error);
      this.message.error(JSON.stringify(error.toString()));
    }
  }

  private checkIfAllEqual(newDepts: Record<string, string>) {
    return Object.entries(newDepts).every(([k, v]) => k in this.lastDepts && this.lastDepts[k] === v);
  }

  private onStart() {
    const tpl = this.previewTpl.createEmbeddedView(null);
    this.renderer.appendChild(this.previewRender.nativeElement, tpl.rootNodes[0]);
    SDK.embedProject(tpl.rootNodes[0], this.project, {
      hideExplorer: true,
      hideDevTools: true,
      hideNavigation: true,
      forceEmbedLayout: true,
      view: "preview",
    }).then(vm => {
      this.vm = vm;
      const iframe = this.previewRender.nativeElement.childNodes[0];
      this.renderer.setAttribute(iframe, "style", "width: 100%; height: 80vh");
      this.renderer.setAttribute(iframe, "height", "");
    });
  }

  private trackPreviewIfNeed(confs?: any) {
    // console.log(confs || this.createContext);
    if (this.showPreview.preview) {
      this.runUpdate(confs);
    }
  }
}

function createDefaultConfigs(): ICompileContext {
  return {
    provider: "react",
    components: [
      {
        id: "GridLayout",
        name: "grid-layout",
        module: "ambjs-layout-module",
        version: "0.0.1-beta.0",
      },
      {
        id: "ZentForm",
        name: "universal-form",
        module: "zent-module",
        version: "0.0.1-beta.0",
      },
    ],
    directives: [
      {
        id: "ZentFormField",
        name: "universal-form-field",
        module: "zent-module",
        version: "0.0.1-beta.0",
      },
      {
        id: "ZentFormSubmit",
        name: "universal-form-submit",
        module: "zent-module",
        version: "0.0.1-beta.0",
      },
    ],
    page: {
      ref: "GridLayout",
      id: "App",
      slot: "app",
      input: {
        basic: {
          padding: {
            type: "literal",
            expression: [
              ["left", "24px"],
              ["right", "24px"],
              ["top", "36px"],
            ],
          },
        },
      },
      children: [
        {
          ref: "ZentForm",
          id: "AppInnerSection01",
          directives: [
            {
              ref: "ZentFormField",
              id: "FormFieldInstance01",
              input: {
                type: {
                  type: "literal",
                  expression: "number",
                },
                required: {
                  type: "literal",
                  expression: true,
                },
                name: {
                  type: "literal",
                  expression: "field01",
                },
                label: {
                  type: "literal",
                  expression: "字段01：",
                },
                placeholder: {
                  type: "literal",
                  expression: "请输入内容",
                },
                value: {
                  type: "literal",
                  expression: 2345124351,
                },
              },
            },
            {
              ref: "ZentFormField",
              id: "FormFieldInstance02",
              input: {
                type: {
                  type: "literal",
                  expression: "text",
                },
                name: {
                  type: "literal",
                  expression: "field02",
                },
                label: {
                  type: "literal",
                  expression: "字段02：",
                },
                placeholder: {
                  type: "literal",
                  expression: "请输入内容22222",
                },
                value: {
                  type: "literal",
                  expression: "evgbweshbestnb",
                },
              },
            },
            {
              ref: "ZentFormField",
              id: "FormFieldInstance03",
              input: {
                type: {
                  type: "literal",
                  expression: "textarea",
                },
                name: {
                  type: "literal",
                  expression: "field03",
                },
                label: {
                  type: "literal",
                  expression: "字段03：",
                },
                placeholder: {
                  type: "literal",
                  expression: "xxx",
                },
                value: {
                  type: "literal",
                  expression: "wsvgqw77we7d27adscf873f8a7dtf",
                },
              },
            },
            {
              ref: "ZentFormField",
              id: "FormFieldInstance04",
              input: {
                type: {
                  type: "literal",
                  expression: "checkbox",
                },
                name: {
                  type: "literal",
                  expression: "field04",
                },
                label: {
                  type: "literal",
                  expression: "字段04：",
                },
                value: {
                  type: "literal",
                  expression: ["abcd", "ijkl"],
                },
                options: {
                  type: "literal",
                  expression: [
                    ["option01", "abcd"],
                    ["option02", "efgh"],
                    ["option03", "ijkl"],
                    ["optionn4", "mnop"],
                  ],
                },
              },
            },
            {
              ref: "ZentFormField",
              id: "FormFieldInstance05",
              input: {
                type: {
                  type: "literal",
                  expression: "select",
                },
                name: {
                  type: "literal",
                  expression: "field05",
                },
                label: {
                  type: "literal",
                  expression: "字段05：",
                },
                placeholder: {
                  type: "literal",
                  expression: "select-placeholder",
                },
                value: {
                  type: "literal",
                  expression: "abcd",
                },
                options: {
                  type: "literal",
                  expression: [
                    ["option01", "abcd"],
                    ["option02", "efgh"],
                    ["option03", "ijkl"],
                    ["optionn4", "mnop"],
                  ],
                },
              },
            },
            {
              ref: "ZentFormField",
              id: "FormFieldInstance06",
              input: {
                type: {
                  type: "literal",
                  expression: "switch",
                },
                name: {
                  type: "literal",
                  expression: "field06",
                },
                label: {
                  type: "literal",
                  expression: "字段06：",
                },
                value: {
                  type: "literal",
                  expression: true,
                },
              },
            },
            {
              ref: "ZentFormSubmit",
              id: "FormSubmitInstance",
              input: {
                showCancel: {
                  type: "literal",
                  expression: true,
                },
                submitText: {
                  type: "literal",
                  expression: "提交",
                },
                cancelText: {
                  type: "literal",
                  expression: "放弃",
                },
              },
            },
          ],
        },
      ],
    },
  };
}
