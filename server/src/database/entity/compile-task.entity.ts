import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ICompileTask, TaskStatus } from "../typings";

@Entity("ews_compile_task")
export class CompileTask implements ICompileTask {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("bigint", {
    nullable: true,
    name: "page_id",
  })
  pageId!: string | number;

  @Column("bigint", {
    nullable: true,
    name: "config_id",
  })
  configId!: string | number;

  @Column("bigint", {
    nullable: true,
    name: "version_id",
  })
  versionId!: string | number;

  @Column("varchar", {
    nullable: false,
    name: "name",
  })
  name!: string;

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

  @Column("varchar", {
    nullable: true,
    name: "description",
    length: 256,
  })
  description!: string;

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
