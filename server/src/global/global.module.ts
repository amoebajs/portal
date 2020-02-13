import { Global, Module } from "@nestjs/common";
import { FakeAuthService } from "#app/services/fake-auth.service";
import { CoreCompiler } from "#app/services/core-compile.service";
import { AppModule } from "#app/app.module";
import { User } from "./services/user.service";
import { Compiler } from "./services/compile.service";
import { ConfigService } from "./services/config.service";
import { ClusterWorker } from "./services/worker.service";
import { Authentication } from "./services/auth.service";

@Global()
@Module({
  imports: [AppModule],
  controllers: [],
  providers: [
    ClusterWorker,
    ConfigService,
    { provide: User, useClass: User },
    { provide: Authentication, useClass: FakeAuthService },
    { provide: Compiler, useClass: CoreCompiler },
  ],
  exports: [ConfigService, Authentication, User, Compiler],
})
export class GlobalModule {}
