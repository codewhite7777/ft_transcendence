import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Channel } from "./Channel";
import { User } from "./User";

@Index("channelinfo_pkey2", ["chid", "userid"], { unique: true })
@Entity("channelinfo", { schema: "public" })
export class Channelinfo {
  @Column("integer", { primary: true, name: "chid" })
  chid: number;

  @Column("integer", { primary: true, name: "userid" })
  userid: number;

  @Column("boolean", { name: "isowner" })
  isowner: boolean;

  @Column("boolean", { name: "isadmin" })
  isadmin: boolean;

  @ManyToOne(() => Channel, (channel) => channel.channelinfos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "chid", referencedColumnName: "id" }])
  ch: Channel;

  @ManyToOne(() => User, (user) => user.channelinfos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "userid", referencedColumnName: "id" }])
  user: User;
}
