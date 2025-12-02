import { Elysia } from "elysia";
import { userRoutes } from "./routes/userRoute";
import { logger } from "@bogeychan/elysia-logger";

const app = new Elysia()
  .use(
    logger({
      level: "info",
    })
  )
  .use(userRoutes)
  .listen(process.env.SERVER_PORT || 9000);

console.log(
  `Project-Name running at ${app.server?.hostname}:${app.server?.port}`
);
