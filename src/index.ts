require("dotenv").config();
import "reflect-metadata";
import express from "express";
import { createConnection } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import { HelloResolver } from "./resolvers/hello";
import { buildSchema } from "type-graphql";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import cors from "cors";
import { UserResolver } from "./resolvers/user";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import { COOKIE_NAME, __prod__ } from "./constants";
import { PostResolver } from "./resolvers/post";
import { MyContext } from "./types/MyContext";
import { buildDataLoaders } from "./utils/dataLoader";
import path from "path";
// import { sendEmail } from "./utils/sendEmail";

const PORT = process.env.PORT || 4000;

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    ...(__prod__
      ? {
          url: process.env.DATABASE_URL,
          // need to add ssl
          extra: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
          ssl: true,
        }
      : {
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          synchronize: true,
        }),

    logging: true,
    entities: [__dirname + "/entities/*.js"],
    migrations: [path.join(__dirname + "/migrations/*")],
  });

  if (__prod__) await connection.runMigrations();

  const app = express();

  // use cors      origin: ["https://studio.apollographql.com", "http://localhost:3000"],

  app.use(
    cors({
      origin: __prod__
        ? process.env.COR_ORIGIN_PROD
        : [
            "https://studio.apollographql.com",
            process.env.COR_ORIGIN_DEV as string,
            "http://localhost:3000",
          ],
      credentials: true,
    })
  );

  // setting mongoose session
  const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME}:${process.env.SESSION_DB_PASSWORD}@reddit.gbngr.mongodb.net/?retryWrites=true&w=majority`;
  await mongoose.connect(mongoUrl);

  app.set("trust proxy", 1);

  app.use(
    session({
      name: COOKIE_NAME,
      saveUninitialized: false,
      secret: "sdafasdfadsf",
      resave: false,
      store: MongoStore.create({ mongoUrl }),
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        secure: __prod__,
        sameSite: "none",
      },
    })
  );
  console.log("Connected to mongoDB");

  // setting apollo server
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, UserResolver, PostResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      connection,
      dataloader: buildDataLoaders(),
    }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false });

  app.get("/", (_, res) => {
    res.send("hello");
  });
  app.listen(PORT, () => {
    console.log(`🚀 Server started on: http://localhost:${PORT}`);
    console.log(`🚀 http://localhost:${PORT}/graphql`);
  });
};

main().catch((err) => console.log(err));
