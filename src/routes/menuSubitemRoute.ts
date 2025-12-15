import { Elysia, t } from "elysia";
import { UserType, Prisma } from "@prisma/client";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";
import { menuSubitemController } from "../controllers/menuSubitemController";

// MENU SUBITEM ROUTES
export function menuSubitemRoutes(app: Elysia) {
  return app
    .use(
      rateLimit({
        duration: 60000,
        max: 100,
      })
    )
    .guard({}, (guardApp) =>
      guardApp
        // GET ALL SUBITEMS FOR A PARENT MENU
        .guard(
          {
            params: t.Object({ parentId: t.Numeric() }),
          },
          (idGuard) =>
            idGuard.get("/:parentId", async ({ headers, params, set }) => {
              const auth = verifyAuth(headers);

              if (!auth.valid) {
                set.status = 403;
                return { success: false, message: auth.error };
              }

              if (
                !hasPermission(auth.user!.type, [
                  UserType.admin,
                  UserType.customer,
                ])
              ) {
                set.status = 403;
                return {
                  success: false,
                  message: "Insufficient permissions",
                };
              }

              try {
                const data = await menuSubitemController.getSubitemsForMenu(
                  params.parentId
                );
                return { success: true, data };
              } catch (error) {
                console.error("Get subitems error:", error);
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            })
        )

        // ADD SUBITEMS TO MENU
        .guard(
          {
            body: t.Object({
              parentId: t.Numeric(),
              subitemIds: t.Array(t.Numeric(), {
                minItems: 1,
              }),
            }),
          },
          (bodyGuard) =>
            bodyGuard.post("/", async ({ headers, body, set }) => {
              const auth = verifyAuth(headers);

              if (!auth.valid) {
                set.status = 403;
                return { success: false, message: auth.error };
              }

              if (!hasPermission(auth.user!.type, [UserType.admin])) {
                set.status = 403;
                return {
                  success: false,
                  message: "Insufficient permissions",
                };
              }

              try {
                const result = await menuSubitemController.addMenuSubitems({
                  parentId: body.parentId,
                  subitemIds: body.subitemIds,
                });

                return {
                  success: true,
                  message: "Menu subitems added successfully",
                  data: result,
                };
              } catch (error: unknown) {
                console.error("Add menu subitems error:", error);

                if (error instanceof Error) {
                  if (
                    error.message.includes("not found") ||
                    error.message.includes("deleted")
                  ) {
                    set.status = 404;
                    return { success: false, message: error.message };
                  }

                  if (error.message.includes("No subitems")) {
                    set.status = 400;
                    return { success: false, message: error.message };
                  }
                }

                set.status = 500;
                return { success: false, message: "Internal server error" };
              }
            })
        )

        // REMOVE SUBITEM FROM MENU
        .guard(
          {
            params: t.Object({ id: t.Numeric() }),
          },
          (idGuard) =>
            idGuard.delete("/:id", async ({ headers, params, set }) => {
              const auth = verifyAuth(headers);

              if (!auth.valid) {
                set.status = 403;
                return { success: false, message: auth.error };
              }

              if (!hasPermission(auth.user!.type, [UserType.admin])) {
                set.status = 403;
                return { success: false, message: "Insufficient permissions" };
              }

              try {
                await menuSubitemController.removeMenuSubitem(params.id);
                return {
                  success: true,
                  message: "Menu subitem removed successfully",
                };
              } catch (error) {
                console.error("Remove menu subitem error:", error);
                if (
                  error instanceof Error &&
                  error.message.includes("not found")
                ) {
                  set.status = 404;
                  return { success: false, message: error.message };
                }
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            })
        )
    );
}
