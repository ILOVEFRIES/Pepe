import { Elysia } from "elysia";
import { userRoutes } from "./routes/userRoute";
import { outletRoutes } from "./routes/outletRoute";
import { logger } from "@bogeychan/elysia-logger";
import cors from "@elysiajs/cors";

const app = new Elysia()
  .use(
    logger({
      level: "info",
    })
  )
  .use(cors())
  .group("/users", userRoutes)
  .group("/outlets", outletRoutes)
  .listen(process.env.PORT || 9000);

console.log(
  `Project-Name running at ${app.server?.hostname}:${app.server?.port}`
);
