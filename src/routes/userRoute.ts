import { Elysia, t } from "elysia";
import { userController } from "../controllers/userController";
import { UserType } from "@prisma/client";
import jwt from "jsonwebtoken";

export const userRoutes = new Elysia({ prefix: "/users" })
  // GET ALL USERS
  .guard({}, (guardApp) =>
    guardApp.get("/", async ({ headers, set }) => {
      try {
        // Check for authorization token
        if (!headers.authorization) {
          set.status = 403;
          return {
            success: false,
            message: "Authorization token required",
          };
        }

        // Verify JWT token
        try {
          const token = headers.authorization.replace("Bearer ", "");
          jwt.verify(token, process.env.JWT_SECRET!);
        } catch {
          set.status = 403;
          return {
            success: false,
            message: "Invalid token",
          };
        }

        const users = await userController.getUsers();
        return {
          success: true,
          data: users,
        };
      } catch (error) {
        console.error("Get users error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Something went wrong",
        };
      }
    })
  )

  // GET USER BY ID
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
    (guardApp) =>
      guardApp.get("/:id", async ({ headers, params, set }) => {
        try {
          // Check for authorization token
          if (!headers.authorization) {
            set.status = 403;
            return {
              success: false,
              message: "Authorization token required",
            };
          }

          // Verify JWT token
          try {
            const token = headers.authorization.replace("Bearer ", "");
            jwt.verify(token, process.env.JWT_SECRET!);
          } catch {
            set.status = 403;
            return {
              success: false,
              message: "Invalid token",
            };
          }

          const user = await userController.getUserById(params.id);

          if (!user) {
            set.status = 404;
            return {
              success: false,
              message: "User not found",
            };
          }

          return {
            success: true,
            data: user,
          };
        } catch (error) {
          console.error("Get user error:", error);
          set.status = 500;
          return {
            success: false,
            message: "Something went wrong",
          };
        }
      })
  )

  // CREATE USER
  .guard(
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        type: t.Enum(UserType),
      }),
    },
    (guardApp) =>
      guardApp.post("/", async ({ headers, body, set }) => {
        try {
          // Check for authorization token
          if (!headers.authorization) {
            set.status = 403;
            return {
              success: false,
              message: "Authorization token required",
            };
          }

          // Verify JWT token
          try {
            const token = headers.authorization.replace("Bearer ", "");
            jwt.verify(token, process.env.JWT_SECRET!);
          } catch {
            set.status = 403;
            return {
              success: false,
              message: "Invalid token",
            };
          }

          // Hash password
          const salt = process.env.SALT;
          const saltedPassword = salt + body.password;
          const hasher = new Bun.CryptoHasher("sha256");
          const hashedPassword = hasher.update(saltedPassword).digest("hex");

          // Create new user
          const result = await userController.createUser({
            u_email: body.email,
            u_password: hashedPassword,
            u_type: body.type,
          });

          return {
            success: true,
            message: "User has been created",
            result,
          };
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            set.status = 409;
            return {
              success: false,
              message: "Duplicate entry",
            };
          }

          console.error("Create user error:", error);
          set.status = 500;
          return {
            success: false,
            message: "Something went wrong",
          };
        }
      })
  )

  // UPDATE USER
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      body: t.Object({
        email: t.Optional(t.String({ format: "email" })),
        type: t.Optional(t.Enum(UserType)),
        password: t.Optional(t.String({ minLength: 6 })),
        is_deleted: t.Optional(t.Boolean()),
      }),
    },
    (guardApp) =>
      guardApp.put("/:id", async ({ headers, params, body, set }) => {
        try {
          // Check for authorization token
          if (!headers.authorization) {
            set.status = 403;
            return {
              success: false,
              message: "Authorization token required",
            };
          }

          // Verify JWT token
          try {
            const token = headers.authorization.replace("Bearer ", "");
            jwt.verify(token, process.env.JWT_SECRET!);
          } catch {
            set.status = 403;
            return {
              success: false,
              message: "Invalid token",
            };
          }

          const updateData: Partial<{
            u_email: string;
            u_type: UserType;
            u_password: string;
            u_is_deleted: boolean;
          }> = {};

          if (body.email !== undefined) updateData.u_email = body.email;
          if (body.type !== undefined) updateData.u_type = body.type;
          if (body.is_deleted !== undefined)
            updateData.u_is_deleted = body.is_deleted;

          // Hash password if provided
          if (body.password !== undefined) {
            const salt = process.env.SALT;
            const saltedPassword = salt + body.password;
            const hasher = new Bun.CryptoHasher("sha256");
            updateData.u_password = hasher.update(saltedPassword).digest("hex");
          }

          const user = await userController.updateUser(params.id, updateData);

          return {
            success: true,
            data: user,
            message: "User updated successfully",
          };
        } catch (error) {
          console.error("Update user error:", error);
          set.status = 500;
          return {
            success: false,
            message: "Something went wrong",
          };
        }
      })
  )

  // TOGGLE USER DELETE STATUS
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
    (guardApp) =>
      guardApp.patch("/:id/toggle-delete", async ({ headers, params, set }) => {
        try {
          // Check for authorization token
          if (!headers.authorization) {
            set.status = 403;
            return {
              success: false,
              message: "Authorization token required",
            };
          }

          // Verify JWT token
          try {
            const token = headers.authorization.replace("Bearer ", "");
            jwt.verify(token, process.env.JWT_SECRET!);
          } catch {
            set.status = 403;
            return {
              success: false,
              message: "Invalid token",
            };
          }

          const user = await userController.toggleUserDelete(params.id);

          return {
            success: true,
            data: user,
            message: `User ${
              (user as { is_deleted: boolean }).is_deleted
                ? "deleted"
                : "restored"
            } successfully`,
          };
        } catch (error) {
          if (error instanceof Error && error.message === "User not found") {
            set.status = 404;
            return {
              success: false,
              message: "User not found",
            };
          }

          console.error("Toggle delete error:", error);
          set.status = 500;
          return {
            success: false,
            message: "Something went wrong",
          };
        }
      })
  );
