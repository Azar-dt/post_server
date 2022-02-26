import { AuthenticationError } from "apollo-server-core";
import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../types/MyContext";

export const checkAuth: MiddlewareFn<MyContext> = async (
  { context: { req } },
  next
) => {
  if (!req.session.userId) throw new AuthenticationError("Not authenticated");
  return next();
};
