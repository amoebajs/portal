import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { TaskStatus, ICompileTask } from "#global/services/worker.service";

@Entity("ews_compile_task")
export class CompileTask implements ICompileTask {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("varchar", {
    nullable: true,
    name: "page_id",
  })
  pageId!: string;

  @Column("varchar", {
    nullable: true,
    name: "version_id",
  })
  versionId!: string;

  @Column("integer", {
    nullable: false,
    name: "status",
  })
  status!: TaskStatus;

  @Column("varchar", {
    nullable: false,
    name: "creator",
  })
  creator!: string;

  @Column("datetime", {
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
    name: "created_at",
  })
  createdAt!: Date;

  @Column("datetime", {
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
    name: "updated_at",
  })
  updatedAt!: Date;
}
