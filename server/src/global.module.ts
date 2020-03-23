import { Global, Module } from "@nestjs/common";
import { FakeAuthService } from "#services/authentication/fake-auth.service";
import { CoreCompiler } from "#services/compiler/core-compile.service";
import { CorePageManager } from "#services/page-manager/page-manager.service";
import { MysqlWorker } from "#database/providers/worker.service";
import { User } from "#services/authentication/user.service";
import { PageManager } from "#services/page-manager/page.service";
import { Compiler } from "#services/compiler/compile.service";
import { ConfigService } from "#services/configs/config.service";
import { Authentication } from "#services/authentication/auth.service";
import { AppModule } from "#app/app.module";

@Global()
@Module({
  imports: [AppModule],
  controllers: [],
  providers: [
    { provide: ConfigService, useClass: ConfigService },
    { provide: MysqlWorker, useClass: MysqlWorker },
    { provide: User, useClass: User },
    { provide: Authentication, useClass: FakeAuthService },
    { provide: PageManager, useClass: CorePageManager },
    { provide: Compiler, useClass: CoreCompiler },
  ],
  exports: [ConfigService, Authentication, User, Compiler, MysqlWorker, PageManager],
})
export class GlobalModule {}
