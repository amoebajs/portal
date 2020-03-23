import { Global, Module } from "@nestjs/common";
import { Authentication, User, FakeAuthService } from "#services/authentication";
import { PageManager, CorePageManager } from "#services/page-manager";
import { MysqlWorker } from "#services/database";
import { Compiler, CoreCompiler } from "#services/compiler";
import { ConfigService } from "#services/configs";
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
