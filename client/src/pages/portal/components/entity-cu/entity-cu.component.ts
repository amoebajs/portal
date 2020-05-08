import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from "@angular/core";
import { NzModalRef } from "ng-zorro-antd";
import { Builder, ICompileContext, IComponentChildDefine } from "../../services/builder.service";
import { IEntityEdit, IEntityEditResult } from "../entity-edit/entity-edit.component";
import { IEntityCreate } from "../module-list/module-list.component";
import { Subject } from "rxjs";

export interface IEntityCUResult {
  result: IEntityEditResult;
  paths: string[];
}

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

  private _onComplete = new Subject<IEntityCUResult>();

  public onComplete = this._onComplete.asObservable();
  public selected?: IEntityEdit;
  public valid: boolean = true;
  public finished = false;

  constructor(private builder: Builder) {}

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
    this._onComplete.next({
      result: e,
      paths: this.paths,
    });
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
      this.modalRef.close();
    }
  }
}
