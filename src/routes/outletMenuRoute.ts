import { t } from "elysia";
import { outletMenuController } from "../controllers/outletMenuController";
import { UserType } from "@prisma/client";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";
import { Prisma } from "@prisma/client";

// OUTLET MENU ROUTES
export function outletMenuRoutes(app: any) {
  return (
    app
      .use(
        rateLimit({
          duration: 60000,
          max: 100,
        })
      )

      // GET ALL OUTLET MENUS (Admin only)
      .guard({}, (guardApp: any) =>
        guardApp.get("/", async ({ headers, set }: any) => {
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
            const data = await outletMenuController.getOutletMenus();
            return { success: true, data };
          } catch (error) {
            console.error("Get outlet menus error:", error);
            set.status = 500;
            return { success: false, message: "Something went wrong" };
          }
        })
      )

      // GET OUTLET MENU BY ID (Admin only)
      .guard(
        {
          params: t.Object({
            id: t.Numeric(),
          }),
        },
        (guardApp: any) =>
          guardApp.get("/:id", async ({ headers, params, set }: any) => {
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
              const outletMenu = await outletMenuController.getOutletMenuById(
                params.id
              );

              if (!outletMenu) {
                set.status = 404;
                return {
                  success: false,
                  message: "Outlet menu not found",
                };
              }

              return { success: true, data: outletMenu };
            } catch (error) {
              console.error("Get outlet menu error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // GET OUTLET MENUS BY OUTLET ID
      .guard(
        {
          params: t.Object({
            outlet_id: t.Numeric(),
          }),
        },
        (guardApp: any) =>
          guardApp.get(
            "/outlet/:outlet_id",
            async ({ headers, params, set }: any) => {
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
                const data =
                  await outletMenuController.getOutletMenusByOutletId(
                    params.outlet_id
                  );

                return { success: true, data };
              } catch (error) {
                console.error("Get outlet menus by outlet error:", error);
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            }
          )
      )

      // GET OUTLET MENU BY PARENT MENU ID & OUTLET ID
      .guard(
        {
          query: t.Object({
            parent_id: t.Numeric(),
            outlet_id: t.Numeric(),
          }),
        },
        (guardApp: any) =>
          guardApp.get("/by-parent", async ({ headers, query, set }: any) => {
            // Authentication
            const auth = verifyAuth(headers);
            if (!auth.valid) {
              set.status = 403;
              return { success: false, message: auth.error };
            }

            // Permission check
            if (
              !hasPermission(auth.user!.type, [
                UserType.admin,
                UserType.customer,
              ])
            ) {
              set.status = 403;
              return { success: false, message: "Insufficient permissions" };
            }

            try {
              // Call controller
              const result =
                await outletMenuController.getOutletMenuByParentIdAndOutletId(
                  query.parent_id,
                  query.outlet_id
                );

              if (!result || result.length === 0) {
                set.status = 404;
                return { success: false, message: "Menu not found" };
              }

              return {
                success: true,
                message: "Menu fetched successfully",
                data: result,
              };
            } catch (error: any) {
              console.error(
                "Get menu by parent ID and outlet ID error:",
                error
              );
              set.status = 500;
              return { success: false, message: "Internal server error" };
            }
          })
      )

      // SEARCH OUTLET MENUS
      .guard(
        {
          query: t.Object({
            outlet_id: t.Numeric(),
            keyword: t.Optional(t.String()),
            category: t.Optional(t.String()),
            is_selling: t.Optional(t.Boolean()),
          }),
        },
        (guardApp: any) =>
          guardApp.get("/search", async ({ query, headers, set }: any) => {
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
              const data = await outletMenuController.searchOutletMenus({
                outlet_id: query.outlet_id,
                keyword: query.keyword,
                category: query.category,
                is_selling: query.is_selling,
              });

              return {
                success: true,
                data,
              };
            } catch (error: any) {
              set.status = 400;
              return {
                success: false,
                message: error.message ?? "Search outlet menu failed",
              };
            }
          })
      )

      // CREATE OUTLET MENU (Admin only)
      .guard(
        {
          body: t.Object({
            menu_id: t.Numeric(),
            outlet_id: t.Numeric(),
            price: t.Numeric(),
            stock: t.Optional(t.Numeric()),
            is_selling: t.Optional(t.Boolean()),
          }),
        },
        (guardApp: any) =>
          guardApp.post("/", async ({ headers, body, set }: any) => {
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
              const created = await outletMenuController.createOutletMenu({
                om_m_id: body.menu_id,
                om_o_id: body.outlet_id,
                om_price: body.price,
                om_stock: body.stock,
                om_is_selling: body.is_selling,
              });

              return {
                success: true,
                message: "Outlet menu created successfully",
                data: created,
              };
            } catch (error: unknown) {
              console.error("Create outlet menu error:", error);

              if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                  set.status = 409;
                  return {
                    success: false,
                    message: "Duplicate outlet menu entry",
                  };
                }
              }

              set.status = 500;
              return {
                success: false,
                message: "Internal server error",
              };
            }
          })
      )

      // UPDATE OUTLET MENU (Admin only)
      .guard(
        {
          params: t.Object({ id: t.Numeric() }),
          body: t.Object({
            price: t.Optional(t.Numeric()),
            stock: t.Optional(t.Numeric()),
            is_selling: t.Optional(t.Boolean()),
            is_deleted: t.Optional(t.Boolean()),
          }),
        },
        (guardApp: any) =>
          guardApp.put("/:id", async ({ headers, params, body, set }: any) => {
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

            const updateData: Record<string, unknown> = {};

            if (body.price !== undefined) updateData.om_price = body.price;
            if (body.stock !== undefined) updateData.om_stock = body.stock;
            if (body.is_selling !== undefined)
              updateData.om_is_selling = body.is_selling;
            if (body.is_deleted !== undefined)
              updateData.om_is_deleted = body.is_deleted;

            try {
              const updated = await outletMenuController.updateOutletMenu(
                params.id,
                updateData
              );

              return {
                success: true,
                message: "Outlet menu updated successfully",
                data: updated,
              };
            } catch (error) {
              console.error("Update outlet menu error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // TOGGLE OUTLET MENU DELETE STATUS (Admin only)
      .guard(
        {
          params: t.Object({ id: t.Numeric() }),
        },
        (guardApp: any) =>
          guardApp.delete("/:id", async ({ headers, params, set }: any) => {
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
              const updated = await outletMenuController.toggleOutletMenuDelete(
                params.id
              );

              return {
                success: true,
                message: "Outlet menu delete status updated",
                data: updated,
              };
            } catch (error) {
              console.error("Toggle outlet menu delete error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )
  );
}
