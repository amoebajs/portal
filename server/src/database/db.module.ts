import { Module } from "@nestjs/common";
import { ConfigService } from "./providers/conf.service";
import { PageService } from "./providers/page.service";
import { TaskService } from "./providers/task.service";
import { VersionService } from "./providers/ver.service";

@Module({
  imports: [],
  controllers: [],
  providers: [ConfigService, PageService, TaskService, VersionService],
  exports: [ConfigService, PageService, TaskService, VersionService],
})
export class DatabaseModule {}
