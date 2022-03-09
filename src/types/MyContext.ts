import { Request, Response } from "express";
import session from "express-session";
import { Connection } from "typeorm";
import { buildDataLoaders } from "../utils/dataLoader";

export type MyContext = {
  req: Request & {
    session: session.Session &
      Partial<session.SessionData> & { userId?: number };
  };
  res: Response;
  connection: Connection;
  dataloader: ReturnType<typeof buildDataLoaders>;
};
