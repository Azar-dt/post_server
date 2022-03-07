import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Vote extends BaseEntity {
  @Field()
  @PrimaryColumn()
  postId!: number;

  @Field()
  @PrimaryColumn()
  userId!: number;

  @Field()
  @Column()
  value!: number;

  @ManyToOne((_of) => Post, (post) => post.votes, {
    onDelete: "CASCADE",
  })
  post: Post;

  @ManyToOne((_of) => User, (user) => user.votes, {
    onDelete: "CASCADE",
  })
  user: User;
}
