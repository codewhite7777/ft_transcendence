import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Channelinfo } from "./Channelinfo";

@Index("channel_pkey2", ["id"], { unique: true })
@Entity("channel", { schema: "public" })
export class Channel {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "kind", nullable: true })
  kind: number | null;

  @Column("character varying", { name: "roomname", nullable: true, length: 50 })
  roomname: string | null;

  @Column("character varying", {
    name: "roompassword",
    nullable: true,
    length: 50,
  })
  roompassword: string | null;

  @ManyToOne(() => User, (user) => user.channels, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "owner", referencedColumnName: "id" }])
  owner: User;

  @ManyToMany(() => User, (user) => user.channels2)
  @JoinTable({
    name: "channelblacklist",
    joinColumns: [{ name: "channelId", referencedColumnName: "id" }],
    inverseJoinColumns: [{ name: "userid", referencedColumnName: "id" }],
    schema: "public",
  })
  users: User[];

  @OneToMany(() => Channelinfo, (channelinfo) => channelinfo.ch)
  channelinfos: Channelinfo[];
}
