import {
  Arg,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { checkAuth } from "../middlewares/checkAuth";
import { PostInput } from "../types/PostInput";
import { PostMutationResponse } from "../types/PostMutationResponse";

@Resolver(() => Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  async user(@Root() root: Post) {
    return await User.findOne({ where: { id: root.userId } });
  }

  @Mutation(() => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async createPost(
    @Arg("postInput") { title, text }: PostInput,
    @Arg("userId") userId: number
  ): Promise<PostMutationResponse> {
    try {
      const newPost = Post.create({
        title,
        text,
        userId,
      });
      await Post.save(newPost);
      return {
        code: 200,
        success: true,
        message: "Creat post successfully",
        post: newPost,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 400,
        success: false,
        message: "Interval server error",
        errors: [
          {
            field: "server",
            message: "Interval server error",
          },
        ],
      };
    }
  }

  @Mutation(() => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async updatePost(
    @Arg("id", () => ID) id: number,
    @Arg("postInput") { title, text }: PostInput
  ): Promise<PostMutationResponse> {
    const post = await Post.findOne({ id });
    if (!post)
      return {
        code: 400,
        success: false,
        message: "Post doesn't exist",
      };
    post.title = title;
    post.text = text;
    await Post.save(post);
    return {
      code: 200,
      success: true,
      message: "Post updated successfully",
      post: post,
    };
  }

  @Mutation(() => PostMutationResponse, { nullable: true })
  @UseMiddleware(checkAuth)
  async deletePost(
    @Arg("id", () => ID) id: number
  ): Promise<PostMutationResponse> {
    const post = await Post.findOne({ id });
    if (!post)
      return {
        code: 400,
        success: false,
        message: "Post doesn't exist",
      };
    await Post.delete({ id });
    return {
      code: 200,
      success: true,
      message: "Deleted post successfully",
    };
  }

  @Query(() => [Post])
  getAllPosts() {
    return Post.find();
  }

  @Query(() => Post, { nullable: true })
  async getPostByID(@Arg("id") id: number) {
    const post = await Post.findOne({ id });
    if (!post) return null;
    return post;
  }
}
