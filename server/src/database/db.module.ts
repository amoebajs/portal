import { Module } from "@nestjs/common";
import { PageConfigRepo } from "./providers/page-config.repo";
import { PageRepo } from "./providers/page.repo";
import { CompileTaskRepo } from "./providers/compile-task.repo";
import { PageVersionRepo } from "./providers/page-version.repo";

@Module({
  imports: [],
  controllers: [],
  providers: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo],
  exports: [PageConfigRepo, PageRepo, CompileTaskRepo, PageVersionRepo],
})
export class DatabaseModule {}
