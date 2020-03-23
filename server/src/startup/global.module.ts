import { Global, Module } from "@nestjs/common";
import { AppModule } from "#app/app.module";
import { DatabaseModule } from "#database/db.module";
import { Authentication, User, FakeAuthService } from "#services/authentication";
import { PageManager, CorePageManager } from "#services/page-manager";
import { MysqlWorker } from "#services/database";
import { Compiler, CoreCompiler } from "#services/compiler";
import { Configs } from "#services/configs";

@Global()
@Module({
  imports: [DatabaseModule, AppModule],
  controllers: [],
  providers: [
    { provide: Configs, useClass: Configs },
    { provide: MysqlWorker, useClass: MysqlWorker },
    { provide: User, useClass: User },
    { provide: Authentication, useClass: FakeAuthService },
    { provide: PageManager, useClass: CorePageManager },
    { provide: Compiler, useClass: CoreCompiler },
  ],
  exports: [Configs, Authentication, User, Compiler, MysqlWorker, PageManager],
})
export class GlobalModule {}
