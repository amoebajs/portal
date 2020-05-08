import SDK from "@stackblitz/sdk";
import yamljs from "js-yaml";
import debounce from "lodash/debounce";
import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, TemplateRef, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NzMessageService, NzModalService } from "ng-zorro-antd";
import { Project } from "@stackblitz/sdk/typings/interfaces";
import { VM } from "@stackblitz/sdk/typings/VM";
import { PortalService } from "../services/portal.service";
import { Builder, ICompileContext } from "../services/builder.service";
import { callContextValidation } from "../components/source-tree/source-tree.component";

@Component({
  selector: "app-portal-preview",
  templateUrl: "./preview.html",
})
export class PortalPreviewComponent implements OnInit, AfterViewInit {
  @ViewChild("previewRender") previewRender: ElementRef;
  @ViewChild("previewTpl") previewTpl: TemplateRef<HTMLDivElement>;
  @ViewChild("saveModalContent") saveModal: TemplateRef<HTMLElement>;

  public isCreate = true;
  public configId!: string;

  public showButton = false;
  public showEditor: "view" | "config" | "hide" = "view";
  public showPreview = {
    edit: true,
    preview: false,
  };

  public lastDepts: Record<string, string> = {};
  public createContext!: ICompileContext;
  public pageConfigs!: string;
  public vm!: VM;

  private project: Project = {
    files: {
      "public/index.html": createTemplate(),
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
    route: ActivatedRoute,
    private renderer: Renderer2,
    private portal: PortalService,
    private builder: Builder,
    private message: NzMessageService,
    private modal: NzModalService,
  ) {
    this.onTextareaChange = debounce(this.onTextareaChange.bind(this), 500);
    route.params.subscribe(async params => {
      const url = route.snapshot.url.map(i => i.path).join("/");
      if (url !== "preview/create" && !!params.id) {
        this.isCreate = false;
        this.configId = params.id;
        const config = await this.portal.fetchConfigDetails(this.configId);
        this.createContext = JSON.parse(config.data);
        this.pageConfigs = yamljs.safeDump(this.createContext);
      } else {
        this.isCreate = true;
        this.createContext = createDEVConfigs();
        this.pageConfigs = yamljs.safeDump(this.createContext);
      }
    });
  }

  ngOnInit() {
    // console.log(this.builder.moduleList);
  }

  ngAfterViewInit() {
    this.showButton = true;
  }

  onEditorClick(value: any) {
    if (value === "config") {
      console.log(this.createContext);
      this.pageConfigs = yamljs.safeDump(this.createContext);
    }
    this.showEditor = value;
  }

  onPreviewClick(target: any) {
    this.showPreview[target] = !this.showPreview[target];
    this.trackPreviewIfNeed();
  }

  onPreviewSaveClick() {
    this.modal.confirm({
      nzTitle: "保存",
      nzWidth: 600,
      nzContent: this.saveModal,
      nzComponentParams: { a: "123" },
    });
  }

  onTextareaChange(value: string) {
    try {
      const newValue = yamljs.safeLoad(value);
      console.log(newValue);
      console.log(JSON.stringify(newValue, null, "  "));
      this.createContext = callContextValidation(newValue);
      this.trackPreviewIfNeed();
      this.builder.createSource(<any>this.createContext, "ts").then(r => console.log(r.sourceCode));
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
      // console.log(result.sourceCode);
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
        this.project.dependencies = { ...result.dependencies };
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

function createTemplate() {
  return `<html>
  <head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;
}

function createDEVConfigs(): ICompileContext {
  return {
    provider: "react",
    page: null,
  };
}
