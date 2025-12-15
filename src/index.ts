import { Elysia } from "elysia";
import { userRoutes } from "./routes/userRoute";
import { outletRoutes } from "./routes/outletRoute";
import { menuRoutes } from "./routes/menuRoute";
import { menuSubitemRoutes } from "./routes/menuSubitemRoute";
import { outletMenuRoutes } from "./routes/outletMenuRoute";
import { orderRoutes } from "./routes/orderRoute";
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
  .group("/menus", menuRoutes)
  .group("/menu-subitems", menuSubitemRoutes)
  .group("/outlet-menus", outletMenuRoutes)
  .group("/orders", orderRoutes)
  .listen(process.env.PORT || 9000);

console.log(`Pepe running at ${app.server?.hostname}:${app.server?.port}`);
