import { Global, Module } from "@nestjs/common";
import { FakeAuthService } from "#app/services/fake-auth.service";
import { CoreCompiler } from "#app/services/core-compile.service";
import { AppModule } from "#app/app.module";
import { User } from "./services/user.service";
import { Compiler } from "./services/compile.service";
import { ConfigService } from "./services/config.service";
import { TaskWorker } from "./services/worker.service";
import { Authentication } from "./services/auth.service";
import { ClusterWorker } from "../clusters/providers/worker.service";
import { MysqlWorker } from "../database/providers/worker.service";

function useMode() {
  const START_MODE = process.env.START_MODE || "app";
  switch (START_MODE) {
    case "mysql":
      return MysqlWorker;
    case "cluster":
      return ClusterWorker;
    default:
      return ClusterWorker;
  }
}

@Global()
@Module({
  imports: [AppModule],
  controllers: [],
  providers: [
    ConfigService,
    { provide: TaskWorker, useClass: useMode() },
    { provide: User, useClass: User },
    { provide: Authentication, useClass: FakeAuthService },
    { provide: Compiler, useClass: CoreCompiler },
  ],
  exports: [ConfigService, Authentication, User, Compiler],
})
export class GlobalModule {}
