import { Field, ObjectType } from "type-graphql";
import { Post } from "../entities/Post";

@ObjectType()
export class PaginatedPosts {
  @Field()
  totalPosts!: number;

  @Field((_type) => Date)
  cursor!: Date;

  @Field()
  hasmore!: boolean;

  @Field(() => [Post])
  paginatedPosts!: Post[];
}
