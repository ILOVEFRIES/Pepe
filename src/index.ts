import { Elysia } from "elysia";
import { userRoutes } from "./routes/userRoute";
import { outletRoutes } from "./routes/outletRoute";
import { logger } from "@bogeychan/elysia-logger";

const app = new Elysia()
  .use(
    logger({
      level: "info",
    })
  )
  .use(userRoutes)
  .use(outletRoutes);

console.log(
  `Project-Name running at ${app.server?.hostname}:${app.server?.port}`
);
