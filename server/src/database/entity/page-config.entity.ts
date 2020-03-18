import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IPageConfig } from "../typings";

@Entity("ews_page_config")
export class PageConfig implements IPageConfig {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("bigint", {
    nullable: false,
    name: "page_id",
  })
  pageId!: string | number;

  @Column("varchar", {
    nullable: false,
    name: "creator",
  })
  creator!: string;

  @Column("text", {
    nullable: true,
    name: "data",
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
