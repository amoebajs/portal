import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IDistStorage } from "../typings";

@Entity("ews_dist_storage")
export class DistStorage implements IDistStorage {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("bigint", {
    name: "version_id",
  })
  versionId!: number | string;

  @Column("mediumblob", {
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
