import { Field, InputType } from "type-graphql";

@InputType()
export class ChangePasswordData {
  @Field()
  newPassword: string;

  @Field()
  token: string;

  @Field()
  userId: string;
}
