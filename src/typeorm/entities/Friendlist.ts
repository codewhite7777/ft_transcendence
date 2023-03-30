import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Index("user_pkey2", ["userId1", "userId2"], { unique: true })
@Entity("friendlist", { schema: "public" })
export class Friendlist {
  @Column("integer", { primary: true, name: "userId1" })
  userId1: number;

  @Column("integer", { primary: true, name: "userId2" })
  userId2: number;

  @ManyToOne(() => User, (user) => user.friendlists, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "userId1", referencedColumnName: "id" }])
  userId: User;

  @ManyToOne(() => User, (user) => user.friendlists2, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "userId2", referencedColumnName: "id" }])
  userId3: User;
}
