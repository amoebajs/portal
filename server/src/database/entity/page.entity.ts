import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IPage, PageStatus } from "#typings/page";

@Entity("ews_page")
export class Page implements IPage {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

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

  @Column("int", {
    nullable: false,
    name: "status",
  })
  status!: PageStatus;

  @Column("varchar", {
    nullable: false,
    name: "name",
  })
  name!: string;

  @Column("varchar", {
    nullable: true,
    name: "display_name",
  })
  displayName!: string;

  @Column("varchar", {
    nullable: true,
    name: "description",
    length: 256,
  })
  description!: string;

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
