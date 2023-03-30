import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Index("userblacklist_pkey3", ["userId1", "userId2"], { unique: true })
@Entity("userblacklist", { schema: "public" })
export class Userblacklist {
  @Column("integer", { primary: true, name: "userId1" })
  userId1: number;

  @Column("integer", { primary: true, name: "userId2" })
  userId2: number;

  @ManyToOne(() => User, (user) => user.userblacklists, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "userId1", referencedColumnName: "id" }])
  userId: User;

  @ManyToOne(() => User, (user) => user.userblacklists2, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "userId2", referencedColumnName: "id" }])
  userId3: User;
}
