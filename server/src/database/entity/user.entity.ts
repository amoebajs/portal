import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IEwsUser } from "#typings/user";

@Entity("ews_user")
export class User implements IEwsUser {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint",
  })
  id!: number | string;

  @Column("varchar", {
    nullable: false,
    name: "key",
  })
  key!: string;

  @Column("varchar", {
    nullable: false,
    name: "name",
  })
  name!: string;

  @Column("varchar", {
    nullable: false,
    name: "account",
  })
  account!: string;

  @Column("text", {
    nullable: true,
    name: "extends",
  })
  extends!: string;

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
