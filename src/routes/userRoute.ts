import { Elysia, t } from "elysia";
import { userController } from "../controllers/userController";
import { UserType } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cors } from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";

// Middleware to verify JWT and extract user
const verifyAuth = (headers: Record<string, string | undefined>) => {
  if (!headers.authorization) {
    return { valid: false, error: "Authorization token required" };
  }

  try {
    const token = headers.authorization.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      email: string;
      type: UserType;
      iat: number;
      exp: number;
    };

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, user: decoded };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
};

// Middleware to check if user has permission
const hasPermission = (userType: UserType, requiredType: UserType[]) => {
  return requiredType.includes(userType);
};

export const userRoutes = new Elysia({ prefix: "/users" })
  // Add CORS
  .use(cors())

  // Add rate limiting
  .use(
    rateLimit({
      duration: 60000, // 1 minute
      max: 100, // 100 requests per minute
    })
  )

  // LOGIN - Public route
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        // Get user by email with password
        const user = await userController.getUserByEmailWithPassword(
          body.email
        );

        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid credentials",
          };
        }

        // Check if user is deleted
        if ((user as { is_deleted: boolean }).is_deleted) {
          set.status = 403;
          return {
            success: false,
            message: "Account has been disabled",
          };
        }

        // Verify password
        const isPasswordValid = await Bun.password.verify(
          body.password,
          (user as { password: string }).password
        );

        if (!isPasswordValid) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid credentials",
          };
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            userId: (user as { id: number }).id,
          },
          process.env.JWT_SECRET!,
          { expiresIn: "30d" } // Token expires in 7 days
        );

        return {
          success: true,
          message: "Login successful",
          token,
          user: {
            id: (user as { id: number }).id,
            email: (user as { email: string }).email,
            type: (user as { type: UserType }).type,
          },
        };
      } catch (error) {
        console.error("Login error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Something went wrong",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )

  // GET ALL USERS - Admin only
  .guard({}, (guardApp) =>
    guardApp.get("/", async ({ headers, set }) => {
      try {
        const auth = verifyAuth(headers);
        if (!auth.valid) {
          set.status = 403;
          return {
            success: false,
            message: auth.error,
          };
        }

        // Check if user is admin
        if (!hasPermission(auth.user!.type, [UserType.admin])) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
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

  // GET USER BY ID - Users can only view themselves unless admin
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
    (guardApp) =>
      guardApp.get("/:id", async ({ headers, params, set }) => {
        try {
          const auth = verifyAuth(headers);
          if (!auth.valid) {
            set.status = 403;
            return {
              success: false,
              message: auth.error,
            };
          }

          // Check if user is viewing their own profile or is admin
          if (
            auth.user!.userId !== params.id &&
            !hasPermission(auth.user!.type, [UserType.admin])
          ) {
            set.status = 403;
            return {
              success: false,
              message: "Insufficient permissions",
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

  // CREATE USER - Admin only
  .guard(
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({
          minLength: 8,
          maxLength: 128,
          // Require at least one uppercase, one lowercase, one number
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        }),
        type: t.Enum(UserType),
      }),
    },
    (guardApp) =>
      guardApp.post("/", async ({ body, set }) => {
        try {
          //   // Check if user is admin
          //   if (!hasPermission(auth.user!.type, [UserType.admin])) {
          //     set.status = 403;
          //     return {
          //       success: false,
          //       message: "Insufficient permissions",
          //     };
          //   }

          // Hash password using Bun's built-in bcrypt-like hashing
          const hashedPassword = await Bun.password.hash(body.password, {
            algorithm: "bcrypt",
            cost: 10,
          });

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

  // CHANGE PASSWORD - Users can change their own password
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      body: t.Object({
        current_password: t.String({ minLength: 1 }),
        new_password: t.String({
          minLength: 8,
          maxLength: 128,
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        }),
        confirm_password: t.String({ minLength: 1 }),
      }),
    },
    (guardApp) =>
      guardApp.put(
        "/:id/change-password",
        async ({ headers, params, body, set }) => {
          try {
            const auth = verifyAuth(headers);
            if (!auth.valid) {
              set.status = 403;
              return {
                success: false,
                message: auth.error,
              };
            }

            // Users can only change their own password
            if (auth.user!.userId !== params.id) {
              set.status = 403;
              return {
                success: false,
                message: "You can only change your own password",
              };
            }

            // Check if new password matches confirmation
            if (body.new_password !== body.confirm_password) {
              set.status = 400;
              return {
                success: false,
                message: "New password and confirmation do not match",
              };
            }

            // Get user with password to verify current password
            const user = await userController.getUserByIdWithPassword(
              params.id
            );

            if (!user) {
              set.status = 404;
              return {
                success: false,
                message: "User not found",
              };
            }

            // Verify current password
            const isCurrentPasswordValid = await Bun.password.verify(
              body.current_password,
              (user as { password: string }).password
            );

            if (!isCurrentPasswordValid) {
              set.status = 401;
              return {
                success: false,
                message: "Current password is incorrect",
              };
            }

            // Hash new password
            const hashedPassword = await Bun.password.hash(body.new_password, {
              algorithm: "bcrypt",
              cost: 10,
            });

            // Update password
            await userController.updateUser(params.id, {
              u_password: hashedPassword,
            });

            return {
              success: true,
              message: "Password changed successfully",
            };
          } catch (error) {
            console.error("Change password error:", error);
            set.status = 500;
            return {
              success: false,
              message: "Something went wrong",
            };
          }
        }
      )
  )

  // UPDATE USER - Users can update themselves, admins can update anyone
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      body: t.Object({
        email: t.Optional(t.String({ format: "email" })),
        type: t.Optional(t.Enum(UserType)),
        is_deleted: t.Optional(t.Boolean()),
      }),
    },
    (guardApp) =>
      guardApp.put("/:id", async ({ headers, params, body, set }) => {
        try {
          const auth = verifyAuth(headers);
          if (!auth.valid) {
            set.status = 403;
            return {
              success: false,
              message: auth.error,
            };
          }

          // Check permissions
          const isOwnProfile = auth.user!.userId === params.id;
          const isAdmin = hasPermission(auth.user!.type, [UserType.admin]);

          if (!isOwnProfile && !isAdmin) {
            set.status = 403;
            return {
              success: false,
              message: "Insufficient permissions",
            };
          }

          // Prevent users from changing their own type or deletion status
          if (isOwnProfile && !isAdmin) {
            if (body.type !== undefined || body.is_deleted !== undefined) {
              set.status = 403;
              return {
                success: false,
                message: "Cannot modify your own role or deletion status",
              };
            }
          }

          // Prevent non-super-admins from creating super admins
          //   if (
          //     body.type === UserType.SUPER_ADMIN &&
          //     auth.user!.type !== UserType.SUPER_ADMIN
          //   ) {
          //     set.status = 403;
          //     return {
          //       success: false,
          //       message: "Cannot assign super admin role",
          //     };
          //   }

          const updateData: Partial<{
            u_email: string;
            u_type: UserType;
            u_is_deleted: boolean;
          }> = {};

          if (body.email !== undefined) updateData.u_email = body.email;
          if (body.type !== undefined) updateData.u_type = body.type;
          if (body.is_deleted !== undefined)
            updateData.u_is_deleted = body.is_deleted;

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

  // TOGGLE USER DELETE STATUS - Admin only
  .guard(
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
    (guardApp) =>
      guardApp.patch("/:id/toggle-delete", async ({ headers, params, set }) => {
        try {
          const auth = verifyAuth(headers);
          if (!auth.valid) {
            set.status = 403;
            return {
              success: false,
              message: auth.error,
            };
          }

          // Check if user is admin
          if (!hasPermission(auth.user!.type, [UserType.admin])) {
            set.status = 403;
            return {
              success: false,
              message: "Insufficient permissions",
            };
          }

          // Prevent users from deleting themselves
          if (auth.user!.userId === params.id) {
            set.status = 403;
            return {
              success: false,
              message: "Cannot delete your own account",
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
