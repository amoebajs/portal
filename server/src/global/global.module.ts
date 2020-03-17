import { Global, Module } from "@nestjs/common";
import { FakeAuthService } from "#app/services/fake-auth.service";
import { CoreCompiler } from "#app/services/core-compile.service";
import { CorePageManager } from "#app/services/page-manager.service";
import { MysqlWorker } from "#database/providers/worker.service";
import { AppModule } from "#app/app.module";
import { User } from "./services/user.service";
import { PageManager } from "./services/page.service";
import { Compiler } from "./services/compile.service";
import { ConfigService } from "./services/config.service";
import { Authentication } from "./services/auth.service";

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
