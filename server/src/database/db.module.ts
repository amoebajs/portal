import { Module } from "@nestjs/common";
import { PageConfigRepo } from "./repos/page-config.repo";
import { PageRepo } from "./repos/page.repo";
import { CompileTaskRepo } from "./repos/compile-task.repo";
import { PageVersionRepo } from "./repos/page-version.repo";

@Module({
  imports: [],
  controllers: [],
  providers: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo],
  exports: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo],
})
export class DatabaseModule {}
