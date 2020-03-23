import { Module } from "@nestjs/common";
import { PageConfigRepo } from "./repos/page-config.repo";
import { PageRepo } from "./repos/page.repo";
import { CompileTaskRepo } from "./repos/compile-task.repo";
import { PageVersionRepo } from "./repos/page-version.repo";
import { DistStorageRepo } from "./repos/dist-storage.repo";

@Module({
  imports: [],
  controllers: [],
  providers: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo, DistStorageRepo],
  exports: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo, DistStorageRepo],
})
export class DatabaseModule {}
