import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IPage } from "#global/services/worker.service";

@Entity("ews_page")
export class Page implements IPage {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("varchar", {
    nullable: true,
    name: "version_id",
  })
  versionId!: string;

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
