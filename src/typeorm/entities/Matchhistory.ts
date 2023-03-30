import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Index("matchhistory_pkey2", ["id"], { unique: true })
@Entity("matchhistory", { schema: "public" })
export class Matchhistory {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("integer", { name: "mapnumber", nullable: true })
  mapnumber: number | null;

  @Column("integer", { name: "winscore", nullable: true })
  winscore: number | null;

  @Column("integer", { name: "losescore", nullable: true })
  losescore: number | null;

  @ManyToOne(() => User, (user) => user.matchhistories, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "loserid", referencedColumnName: "id" }])
  loser: User;

  @ManyToOne(() => User, (user) => user.matchhistories2, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "winnerid", referencedColumnName: "id" }])
  winner: User;
}
