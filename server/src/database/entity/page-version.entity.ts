import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IPageVersion } from "#typings/page";

@Entity("ews_page_version")
export class PageVersion implements IPageVersion {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("bigint", {
    nullable: false,
    name: "config_id",
  })
  configId!: number | string;

  @Column("bigint", {
    nullable: true,
    name: "task_id",
  })
  taskId!: number | string;

  @Column("bigint", {
    nullable: false,
    name: "page_id",
  })
  pageId!: string | number;

  @Column("varchar", {
    nullable: false,
    name: "name",
  })
  name!: string;

  @Column("varchar", {
    nullable: false,
    name: "creator",
  })
  creator!: string;

  @Column("text", {
    nullable: true,
    name: "metadata",
  })
  metadata!: string;

  @Column("text", {
    nullable: true,
    name: "dist",
  })
  dist!: string;

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
