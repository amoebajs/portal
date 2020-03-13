import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { TaskStatus } from "#global/services/worker.service";

@Entity("compile_task")
export class CompileTask {
  @PrimaryGeneratedColumn({
    name: "id",
  })
  id!: number;

  @Column("varchar", {
    nullable: false,
    name: "task_name",
    length: 128,
  })
  name!: string;

  @Column("integer", {
    nullable: false,
    name: "task_status",
  })
  status!: TaskStatus;

  @Column("varchar", {
    nullable: false,
    name: "task_creator",
  })
  creator!: string;

  @Column("varchar", {
    nullable: false,
    name: "task_operator",
  })
  operator!: string;

  @Column("varchar", {
    nullable: false,
    name: "task_data",
    length: 256,
  })
  data!: string;

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
