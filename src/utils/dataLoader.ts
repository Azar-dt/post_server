import DataLoader from "dataloader";
import { User } from "../entities/User";
import { Vote } from "../entities/Vote";

const batchGetUsers = async (userIds: number[]) => {
  const users = await User.findByIds(userIds);
  return userIds.map((userId) => users.find((user) => user.id === userId));
};

interface VoteTypeCondition {
  postId: number;
  userId: number;
}

const batchGetCurrentUserVoteType = async (conditions: VoteTypeCondition[]) => {
  const voteTypes = await Vote.findByIds(conditions);
  return conditions.map((condition) =>
    voteTypes.find(
      (voteType) =>
        voteType.postId === condition.postId &&
        voteType.userId === condition.userId
    )
  );
};

export const buildDataLoaders = () => ({
  userLoader: new DataLoader<number, User | undefined>((userIds) =>
    batchGetUsers(userIds as number[])
  ),
  currentUserVoteType: new DataLoader<VoteTypeCondition, Vote | undefined>(
    (conditions) =>
      batchGetCurrentUserVoteType(conditions as VoteTypeCondition[])
  ),
});
