import { mongoose, prop, getModelForClass } from "@typegoose/typegoose";

export class Token {
  _id!: mongoose.Types.ObjectId;

  @prop({ required: true })
  public userId!: string;

  @prop({ required: true })
  public token!: string;

  @prop({ default: Date.now(), expires: 60 * 5 })
  public createdAt: Date;
}

export const TokenModel = getModelForClass(Token);
