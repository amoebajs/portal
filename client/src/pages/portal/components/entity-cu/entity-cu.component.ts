import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from "@angular/core";
import { NzModalRef } from "ng-zorro-antd";
import { ICompileContext, IComponentChildDefine } from "../../services/builder.service";
import { IEntityEdit, IEntityEditResult } from "../entity-edit/typings";
import { IEntityCreate } from "../module-list/typings";

@Component({
  selector: "app-portal-entity-cu",
  templateUrl: "./entity-cu.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityCUComponent implements OnInit, OnDestroy {
  @Input()
  public modalRef!: NzModalRef;

  @Input()
  public context: ICompileContext;

  @Input()
  public paths?: string[];

  @Input()
  public target?: IEntityEdit;

  @Input()
  public parent?: IComponentChildDefine;

  public selected?: IEntityEdit;
  public result?: IEntityEditResult;
  public valid: boolean = true;
  public finished = false;
  public completed = false;

  constructor() {}

  ngOnInit(): void {
    this.selected = this.target;
  }

  ngOnDestroy(): void {}

  editGoBack() {
    this.selected = void 0;
    if (this.modalRef) {
      this.modalRef.updateConfig({ nzWidth: 500 });
    }
  }

  saveEntityTemp(e: IEntityCreate) {
    this.selected = e;
    if (this.modalRef) {
      this.modalRef.updateConfig({ nzWidth: 800 });
    }
  }

  receiveEmitEntityValid(e: boolean) {
    this.valid = e;
  }

  receiveEmitEntity(e: any) {
    this.result = e;
    this.completed = true;
    this.modalRef.triggerOk();
  }

  clickOk() {
    if (!this.valid) return;
    if (this.modalRef) {
      this.finished = true;
      this.modalRef.close();
    }
  }

  clickCancel() {
    if (this.modalRef) {
      this.modalRef.triggerCancel();
    }
  }
}
