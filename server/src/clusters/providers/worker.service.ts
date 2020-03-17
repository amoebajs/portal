import { Injectable } from "@nestjs/common";
import { Worker } from "../core";
import { BehaviorSubject } from "rxjs";
import { TaskWorker } from "#global/services/worker.service";

// @Injectable()
// export class ClusterWorker extends Worker implements TaskWorker {
//   private __init = false;
//   public readonly active = new BehaviorSubject(false);

//   constructor() {
//     super();
//     this.onActive(() => this.active.next(true));
//     this.__init = true;
//   }

//   public onActive(fn: () => void) {
//     if (!this.__init) {
//       super.onActive(fn);
//     }
//   }
// }
