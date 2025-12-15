import { t } from "elysia";
import { menuController } from "../controllers/menuController";
import { UserType, Prisma } from "@prisma/client";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";
import { firebaseMiddleware } from "../middleware/firebase";
import {
  uploadMenuImage,
  deleteMenuImage,
} from "../controllers/menuImage.controller";

// MENU ROUTES
export function menuRoutes(app: any) {
  return app
    .use(
      rateLimit({
        duration: 60000,
        max: 100,
      })
    )

    .use(firebaseMiddleware)

    .guard({}, (guardApp: any) =>
      guardApp

        // GET ALL MENUS
        .get("/", async ({ headers, set }: any) => {
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
            const data = await menuController.getMenus();
            return { success: true, data };
          } catch (error) {
            console.error("Get menus error:", error);
            set.status = 500;
            return { success: false, message: "Something went wrong" };
          }
        })

        // GET MENU BY ID
        .guard(
          {
            params: t.Object({ id: t.Numeric() }),
          },
          (idGuard: any) =>
            idGuard.get("/:id", async ({ headers, params, set }: any) => {
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
                const menu = await menuController.getMenuById(params.id);

                if (!menu) {
                  set.status = 404;
                  return { success: false, message: "Menu not found" };
                }

                return { success: true, data: menu };
              } catch (error) {
                console.error("Get menu error:", error);
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            })
        )

        // CREATE MENU
        .guard(
          {
            body: t.Object({
              sku: t.String(),
              name: t.String(),
              desc: t.String(),
              category: t.String(),

              // image upload (multipart/form-data)
              image: t.Optional(
                t.File({
                  type: ["image/png", "image/jpeg", "image/webp"],
                  maxSize: 5 * 1024 * 1024, // 5MB
                })
              ),
            }),
          },
          (bodyGuard: any) =>
            bodyGuard.post("/", async ({ headers, body, set }: any) => {
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
                let pictureUrl: string | undefined;
                let picturePath: string | undefined;

                // UPLOAD IMAGE TO FIREBASE
                if (body.image) {
                  const uploaded = await uploadMenuImage(
                    Buffer.from(await body.image.arrayBuffer()),
                    body.sku,
                    body.image.type
                  );

                  pictureUrl = uploaded.url;
                  picturePath = uploaded.path;
                }

                // CREATE MENU WITH GENERATED IMAGE DATA
                const result = await menuController.createMenu({
                  m_sku: body.sku,
                  m_name: body.name,
                  m_desc: body.desc,
                  m_picture_url: pictureUrl,
                  m_picture_path: picturePath,
                  m_category: body.category,
                });

                return {
                  success: true,
                  message: "Menu created successfully",
                  data: result,
                };
              } catch (error: unknown) {
                console.error("Create menu error:", error);

                if (
                  error instanceof Prisma.PrismaClientKnownRequestError &&
                  error.code === "P2002"
                ) {
                  set.status = 409;
                  return {
                    success: false,
                    message: "Duplicate menu SKU",
                  };
                }

                set.status = 500;
                return {
                  success: false,
                  message: "Internal server error",
                };
              }
            })
        )

        // UPDATE MENU
        .guard(
          {
            params: t.Object({ id: t.Numeric() }),
            body: t.Object({
              sku: t.Optional(t.String()),
              name: t.Optional(t.String()),
              desc: t.Optional(t.String()),
              category: t.Optional(t.String()),

              // NEW IMAGE UPLOAD
              image: t.Optional(
                t.File({
                  type: ["image/png", "image/jpeg", "image/webp"],
                  maxSize: 5 * 1024 * 1024,
                })
              ),
            }),
          },
          (updateGuard: any) =>
            updateGuard.put(
              "/:id",
              async ({ headers, params, body, set }: any) => {
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
                  // Fetch existing menu (for old image)
                  const menu = await menuController.getMenuById(params.id);

                  if (!menu) {
                    set.status = 404;
                    return { success: false, message: "Menu not found" };
                  }

                  let pictureUrl: string | undefined =
                    menu.picture_url ?? undefined;
                  let picturePath: string | undefined =
                    menu.picture_path ?? undefined;

                  if (body.image) {
                    if (picturePath) {
                      await deleteMenuImage(picturePath);
                    }

                    // upload new image
                    const uploaded = await uploadMenuImage(
                      Buffer.from(await body.image.arrayBuffer()),
                      body.sku ?? menu.sku,
                      body.image.type
                    );

                    pictureUrl = uploaded.url;
                    picturePath = uploaded.path;
                  }

                  // Update DB
                  const updated = await menuController.updateMenu(params.id, {
                    ...(body.sku !== undefined && { m_sku: body.sku }),
                    ...(body.name !== undefined && { m_name: body.name }),
                    ...(body.desc !== undefined && { m_desc: body.desc }),
                    ...(body.category !== undefined && {
                      m_category: body.category,
                    }),
                    m_picture_url: pictureUrl,
                    m_picture_path: picturePath,
                  });

                  return {
                    success: true,
                    message: "Menu updated successfully",
                    data: updated,
                  };
                } catch (error) {
                  console.error("Update menu error:", error);
                  set.status = 500;
                  return { success: false, message: "Something went wrong" };
                }
              }
            )
        )

        // TOGGLE MENU DELETE STATUS
        .guard(
          {
            params: t.Object({ id: t.Numeric() }),
          },
          (toggleGuard: any) =>
            toggleGuard.delete(
              "/:id",
              async ({ headers, params, set }: any) => {
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
                  // Get current menu
                  const menu = await menuController.getMenuById(params.id);
                  if (!menu) {
                    set.status = 404;
                    return { success: false, message: "Menu not found" };
                  }

                  // If deleting → delete image
                  if (!menu.is_deleted && menu.picture_path) {
                    await deleteMenuImage(menu.picture_path);
                  }

                  // Toggle delete flag
                  const updated = await menuController.toggleMenuDelete(
                    params.id
                  );

                  return {
                    success: true,
                    message: "Menu delete status updated",
                    data: updated,
                  };
                } catch (error) {
                  console.error("Toggle menu delete error:", error);
                  set.status = 500;
                  return { success: false, message: "Something went wrong" };
                }
              }
            )
        )
    );
}
