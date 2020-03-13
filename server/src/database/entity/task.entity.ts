import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("ews_compile_task")
export class CompileTask {
  @PrimaryGeneratedColumn({
    name: "id",
  })
  id!: number;

  @Column("varchar", {
    nullable: false,
    name: "task_id",
    length: 128,
  })
  taskId!: string;

  @Column("integer", {
    nullable: false,
    name: "task_locked",
  })
  locked!: 0 | 1;

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
    name: "task_storage",
    length: 256,
  })
  storage!: string;

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
