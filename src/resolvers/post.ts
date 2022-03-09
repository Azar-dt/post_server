import { UserInputError } from "apollo-server-core";
import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Query,
  registerEnumType,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { LessThan } from "typeorm";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { Vote } from "../entities/Vote";
import { checkAuth } from "../middlewares/checkAuth";
import { MyContext } from "../types/MyContext";
import { PaginatedPosts } from "../types/PaginatedPosts";
import { PostInput } from "../types/PostInput";
import { PostMutationResponse } from "../types/PostMutationResponse";
import { VoteType } from "../types/VoteType";

registerEnumType(VoteType, {
  name: "VoteType", // this one is mandatory
});

@Resolver(() => Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  async user(
    @Root() root: Post,
    @Ctx() { dataloader: { userLoader } }: MyContext
  ) {
    // return await User.findOne({ where: { id: root.userId } });
    return await userLoader.load(root.userId);
  }

  @FieldResolver(() => User)
  async currentUserVoteType(
    @Root() root: Post,
    @Ctx()
    {
      req: {
        session: { userId },
      },
      dataloader: { currentUserVoteType },
    }: MyContext
  ) {
    if (!userId) return 0;
    const existedVote = await currentUserVoteType.load({
      postId: root.id,
      userId,
    });
    return existedVote ? existedVote.value : 0;
  }

  @Mutation(() => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async createPost(
    @Arg("postInput") { title, text }: PostInput,
    // @Arg("userId") userId: number,
    @Ctx() { req }: MyContext
  ): Promise<PostMutationResponse> {
    try {
      const userId = req.session.userId;
      // console.log(userId);

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
    @Arg("postInput") { title, text }: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<PostMutationResponse> {
    const post = await Post.findOne({ id });
    if (!post)
      return {
        code: 400,
        success: false,
        message: "Post doesn't exist",
      };
    if (req.session.userId !== post.userId)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
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
    @Arg("id", () => ID) id: number,
    @Ctx() { req }: MyContext
  ): Promise<PostMutationResponse> {
    const post = await Post.findOne({ id });
    if (!post)
      return {
        code: 400,
        success: false,
        message: "Post doesn't exist",
      };
    if (req.session.userId !== post.userId)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
      };
    await Post.delete({ id });
    return {
      code: 200,
      success: true,
      message: "Deleted post successfully",
    };
  }

  @Query(() => [Post], { nullable: true })
  async getAllPosts(): Promise<Post[] | null> {
    try {
      const posts = await Post.find();
      return posts;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query(() => Post, { nullable: true })
  async getPostByID(@Arg("id") id: number) {
    const post = await Post.findOne({ id });
    if (!post) return null;
    return post;
  }

  @Query(() => PaginatedPosts, { nullable: true })
  async posts(
    @Arg("limit", (_type) => Int) limit: number,
    @Arg("cursor", { nullable: true }) cursor?: string
  ): Promise<PaginatedPosts | null> {
    try {
      const realLimit = Math.min(5, limit);
      const totalPosts = await Post.count();
      const lastPost = await Post.findOne({
        order: {
          createdAt: "ASC",
        },
      });
      // console.log(lastPost);

      const findOptions: { [key: string]: any } = {
        order: {
          createdAt: "DESC", // post nao tao sau cung se len dau
        },
        take: realLimit,
      };
      if (cursor) {
        findOptions.where = {
          createdAt: LessThan(cursor),
        };
      }
      const paginatedPosts = await Post.find(findOptions);

      const newCursor = paginatedPosts[paginatedPosts.length - 1].createdAt;
      return {
        totalPosts,
        cursor: newCursor,
        hasmore: newCursor.toString() !== lastPost?.createdAt.toString(),
        paginatedPosts,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async vote(
    @Arg("postId", (_type) => Int) postId: number,
    @Arg("inputVoteValue", (_type) => VoteType) inputVoteValue: VoteType,
    @Ctx()
    {
      req: {
        session: { userId },
      },
      connection,
    }: MyContext
  ): Promise<PostMutationResponse> {
    return await connection.transaction(async (transactionEntityManager) => {
      let post = await transactionEntityManager.findOne(Post, { id: postId });
      if (!post) {
        throw new UserInputError("Post not found");
      }
      // check if user has voted or not
      const existedVote = await transactionEntityManager.findOne(Vote, {
        postId,
        userId,
      });
      if (existedVote && existedVote.value !== inputVoteValue) {
        await transactionEntityManager.save(Vote, {
          ...existedVote,
          value: inputVoteValue,
        });
        post = await transactionEntityManager.save(Post, {
          ...post,
          points: post.points + 2 * inputVoteValue,
        });
      }
      if (!existedVote) {
        const newVote = transactionEntityManager.create(Vote, {
          userId,
          postId,
          value: inputVoteValue,
        });
        await transactionEntityManager.save(newVote);
        post = await transactionEntityManager.save(Post, {
          ...post,
          points: post.points + inputVoteValue,
        });
      }
      return {
        code: 200,
        success: true,
        message: "Post voted successfully",
        post,
      };
    });
  }
}
