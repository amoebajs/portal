import { Global, Module } from "@nestjs/common";
import { FakeAuthService, Authentication } from "#app/services/fake-auth.service";
import { UserService } from "#global/services/user.service";
import { CoreCompiler, Compiler } from "#app/services/core-compile.service";
import { ConfigService } from "#global/services/config.service";
import { ClusterWorker } from "#global/services/worker.service";
import { AppModule } from "#app/app.module";

@Global()
@Module({
  imports: [AppModule],
  controllers: [],
  providers: [
    ClusterWorker,
    ConfigService,
    UserService,
    { provide: Authentication, useClass: FakeAuthService },
    { provide: Compiler, useClass: CoreCompiler },
  ],
  exports: [ConfigService, Authentication, UserService, Compiler],
})
export class GlobalModule {}
