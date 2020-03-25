import { Global } from "@nestjs/common";
import { AppModule } from "#app/app.module";
import { ProvidersModule } from "#utils/base";
import { DatabaseModule } from "#database/db.module";
import { Authentication, User, FakeAuthService } from "#services/authentication";
import {
  PageVersionManager,
  CorePageVersionManager,
  PagePersistenceManager,
  PagePersistenceDbStorage,
} from "#services/manager";
import { MysqlWorker } from "#services/database";
import { DbConnection } from "#services/database/connection";
import { Compiler, CoreCompiler } from "#services/compiler";
import { Configs } from "#services/configs";

@Global()
@ProvidersModule({
  imports: [DatabaseModule, AppModule],
  controllers: [],
  providers: [
    { provide: User, useClass: User },
    { provide: Configs, useClass: Configs },
    { provide: Compiler, useClass: CoreCompiler },
    { provide: DbConnection, useClass: DbConnection },
    { provide: MysqlWorker, useClass: MysqlWorker },
    { provide: Authentication, useClass: FakeAuthService },
    { provide: PageVersionManager, useClass: CorePageVersionManager },
    { provide: PagePersistenceManager, useClass: PagePersistenceDbStorage },
  ],
  exports: [],
})
export class GlobalModule {}
