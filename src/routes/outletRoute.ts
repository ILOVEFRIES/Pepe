import { t } from "elysia";
import { outletController } from "../controllers/outletController";
import { UserType } from "@prisma/client";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";
import { Prisma } from "@prisma/client";

// OUTLET ROUTES
export function outletRoutes(app: any) {
  return (
    app
      .use(
        rateLimit({
          duration: 60000,
          max: 100,
          generator: (req) =>
            req.headers.get("cf-connecting-ip") ??
            req.headers.get("x-forwarded-for") ??
            "unknown",
        })
      )

      // GET ALL OUTLETS (Admin only)
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
            const data = await outletController.getOutlets();
            return { success: true, data };
          } catch (error) {
            console.error("Get outlets error:", error);
            set.status = 500;
            return { success: false, message: "Something went wrong" };
          }
        })
      )

      // GET OUTLET BY ID (Admin only)
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
              const outlet = await outletController.getOutletById(params.id);

              if (!outlet) {
                set.status = 404;
                return { success: false, message: "Outlet not found" };
              }

              return { success: true, data: outlet };
            } catch (error) {
              console.error("Get outlet error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // CREATE OUTLET (Admin only)
      .guard(
        {
          body: t.Object({
            name: t.String(),
            user_id: t.Numeric(),
            tax: t.Numeric(),
            sc: t.Numeric(),
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
              return { success: false, message: "Insufficient permissions" };
            }

            try {
              const result = await outletController.createOutlet({
                o_name: body.name,
                o_u_id: body.user_id,
                o_tax: body.tax,
                o_sc: body.sc,
              });

              return {
                success: true,
                message: "Outlet created successfully",
                data: result,
              };
            } catch (error: unknown) {
              console.error("Create outlet error:", error);

              if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                  set.status = 409;
                  return {
                    success: false,
                    message: "Duplicate outlet name/user",
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

      // UPDATE OUTLET (Admin only)
      .guard(
        {
          params: t.Object({ id: t.Numeric() }),
          body: t.Object({
            name: t.Optional(t.String()),
            user_id: t.Optional(t.Numeric()),
            tax: t.Optional(t.Numeric()),
            sc: t.Optional(t.Numeric()),
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
              return { success: false, message: "Insufficient permissions" };
            }

            const updateData: Record<string, unknown> = {};

            if (body.name !== undefined) updateData.o_name = body.name;
            if (body.user_id !== undefined) updateData.o_u_id = body.user_id;
            if (body.tax !== undefined) updateData.o_tax = body.tax;
            if (body.sc !== undefined) updateData.o_sc = body.sc;
            if (body.is_deleted !== undefined)
              updateData.o_is_deleted = body.is_deleted;

            try {
              const updated = await outletController.updateOutlet(
                params.id,
                updateData
              );

              return {
                success: true,
                message: "Outlet updated successfully",
                data: updated,
              };
            } catch (error) {
              console.error("Update outlet error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // TOGGLE DELETE STATUS (Admin only)
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
              return { success: false, message: "Insufficient permissions" };
            }

            try {
              const updated = await outletController.toggleOutletDelete(
                params.id
              );

              return {
                success: true,
                message: "Outlet delete status updated",
                data: updated,
              };
            } catch (error) {
              console.error("Toggle delete error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )
  );
}
