import { User } from "../entities/User";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { hash, verify } from "argon2";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { RegisterInput } from "../types/RegisterInput";
import { LoginInput } from "../types/LoginInput";
import { validateRegisterInput } from "../utils/validateRegisterInput";
import { MyContext } from "src/types/MyContext";
import { COOKIE_NAME } from "../constants";
import { ForgotPasswordInput } from "../types/ForgotPasswordInput";
import { sendEmail } from "../utils/sendEmail";
import { TokenModel } from "../models/token";
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";
import { ChangePasswordData } from "../types/ChangePasswordData";

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    // const curUser = User.findOne(req.session.userId);
    // if (!curUser) return null;
    // return curUser;
    return await User.findOne({ id: req.session.userId });
  }

  @Query((_return) => [User], { nullable: true })
  async getAllUsers() {
    return await User.find();
  }

  @Mutation(() => UserMutationResponse)
  async register(
    @Arg("registerInput") registerInput: RegisterInput,
    @Ctx() { req }: MyContext
  ): Promise<UserMutationResponse> {
    // try {
    const validateError = validateRegisterInput(registerInput);
    if (validateError)
      return {
        code: 400,
        success: false,
        ...validateError,
      };
    const { email, username, password } = registerInput;
    const existedUser = await User.findOne({
      where: [{ username }, { email }],
    });
    if (existedUser) {
      return {
        code: 400,
        success: false,
        message: "Duplicate username or email",
        errors: [
          {
            field: existedUser.username == username ? "username" : "email",
            message: `${
              existedUser.username == username ? "Username" : "Email"
            } has already taken`,
          },
        ],
      };
    }
    const hashedPassword = await hash(password);
    const user = User.create({
      email: email,
      username: username,
      password: hashedPassword,
    });

    const createdUser = await User.save(user);
    req.session.userId = createdUser.id;
    return {
      code: 200,
      success: true,
      message: "Register successfully",
      user: createdUser,
    };

    // } catch (err) {
    //   console.log(err);
    //   return null;
    // }
  }

  @Mutation(() => UserMutationResponse)
  async login(
    @Arg("loginInput") loginInput: LoginInput,
    @Ctx() { req }: MyContext
  ): Promise<UserMutationResponse> {
    const conditionCheck = loginInput.usernameOrEmail.includes("@")
      ? { email: loginInput.usernameOrEmail }
      : { username: loginInput.usernameOrEmail };
    const existedUser = await User.findOne(conditionCheck);
    if (!existedUser)
      return {
        code: 400,
        success: false,
        message: "User not found",
        errors: [
          {
            field: "usernameOrEmail",
            message: "Username or email incorrect",
          },
        ],
      };
    const checkPassword = await verify(
      existedUser.password,
      loginInput.password
    );
    if (!checkPassword)
      return {
        code: 400,
        success: false,
        message: "Password incorrect",
        errors: [
          {
            field: "password",
            message: "Password incorrect",
          },
        ],
      };

    // create session
    req.session.userId = existedUser.id;

    return {
      code: 200,
      success: true,
      message: "login success",
      user: existedUser,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve, _) => {
      res.clearCookie(COOKIE_NAME);
      req.session.destroy((err) => {
        if (err) {
          console.log("Destroying session error ", err);
          resolve(false);
        }
        resolve(true);
      });
    });
  }

  @Mutation(() => UserMutationResponse)
  async deleteUserByUsername(
    @Arg("username") username: string
  ): Promise<UserMutationResponse> {
    const user = await User.findOne({ username: username });
    if (!user)
      return {
        code: 400,
        success: false,
        message: "user doesn't exist",
        errors: [
          {
            field: "username",
            message: "user doesn't exist",
          },
        ],
      };
    await User.delete({ username: username });
    return {
      code: 200,
      success: true,
      message: "user has been deleted",
      user,
    };
  }

  @Mutation(() => Boolean)
  async ForgotPassword(
    @Arg("forgotPasswordInput") forgotPasswordInput: ForgotPasswordInput
  ) {
    const user = await User.findOne({ email: forgotPasswordInput.email });
    if (!user) return true;

    await TokenModel.findOneAndDelete({ userId: `${user.id}` });
    // save token to database
    const resetToken = uuidv4();
    const hashedResetToken = await argon2.hash(resetToken);
    await new TokenModel({
      userId: `${user.id.toString()}`,
      token: hashedResetToken,
    }).save();
    // send email to reset password
    await sendEmail(
      forgotPasswordInput.email,
      `<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">Clike here to change your password</a>`
    );
    return true;
  }

  @Mutation(() => UserMutationResponse)
  async changePassword(
    @Arg("changePasswordData") changePasswordData: ChangePasswordData
  ): Promise<UserMutationResponse> {
    const userToken = await TokenModel.findOne({
      userId: changePasswordData.userId,
    });
    if (!userToken)
      return {
        code: 400,
        success: false,
        message: "Invalid token",
        errors: [
          {
            field: "token",
            message: "Token has been expried",
          },
        ],
      };
    if (changePasswordData.newPassword.length <= 2)
      return {
        code: 400,
        success: false,
        message: "Invalid password",
        errors: [
          {
            field: "newPassword",
            message: "Length must greater than 2",
          },
        ],
      };

    //check token
    const checkToken = await argon2.verify(
      userToken.token,
      changePasswordData.token
    );
    if (!checkToken) {
      return {
        code: 400,
        success: false,
        message: "Invalid token",
        errors: [
          {
            field: "token",
            message: "Invalid token",
          },
        ],
      };
    } else {
      const user = await User.findOne({
        id: Number(changePasswordData.userId),
      });
      if (!user)
        return {
          code: 400,
          success: false,
          message: "User not found",
          errors: [
            {
              field: "user",
              message: "User not found",
            },
          ],
        };
      const hashedNewPassword = await argon2.hash(
        changePasswordData.newPassword
      );
      user.password = hashedNewPassword;
      await user.save();
      await userToken.delete();
      return {
        code: 200,
        success: true,
        message: "Updated password successfully",
        user: user,
      };
    }
  }
}
