import { t } from "elysia";
import { userController } from "../controllers/userController";
import { UserType } from "@prisma/client";
import jwt from "jsonwebtoken";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";

export function userRoutes(app: any) {
  return (
    app

      // Add rate limiting
      .use(
        rateLimit({
          duration: 60000, // 1 minute
          max: 100, // 100 requests per minute
        })
      )

      // LOGIN - Public route
      .guard(
        {
          body: t.Object({
            email: t.String({ format: "email" }),
            password: t.String(),
          }),
        },
        (guardApp: any) =>
          guardApp.post("/login", async ({ body, set }: any) => {
            try {
              const user = await userController.getUserByEmailWithPassword(
                body.email
              );

              if (!user) {
                set.status = 401;
                return { success: false, message: "Invalid credentials" };
              }

              if ((user as { is_deleted: boolean }).is_deleted) {
                set.status = 403;
                return { success: false, message: "Account has been disabled" };
              }

              const isPasswordValid = await Bun.password.verify(
                body.password,
                (user as { password: string }).password
              );

              if (!isPasswordValid) {
                set.status = 401;
                return { success: false, message: "Invalid credentials" };
              }

              const payload = {
                userId: (user as { id: number }).id,
                type: (user as { type: UserType }).type,
              } as jwt.JwtPayload;

              const options = {
                expiresIn: process.env.JWT_EXPIRES ?? "30d",
              } as jwt.SignOptions;

              const token = jwt.sign(
                payload,
                process.env.JWT_SECRET as string,
                options
              );

              return {
                success: true,
                message: "Login successful",
                token,
              };
            } catch (error) {
              console.error("Login error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // CREATE CUSTOMER
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
          }),
        },
        (guardApp: any) =>
          guardApp.post("/register/customer", async ({ body, set }: any) => {
            try {
              const hashedPassword = await Bun.password.hash(body.password, {
                algorithm: "bcrypt",
                cost: 10,
              });

              const result = await userController.createUser({
                u_email: body.email,
                u_password: hashedPassword,
                u_type: UserType.customer,
              });

              return {
                success: true,
                message: "Customer registered successfully",
                result,
              };
            } catch (error: any) {
              if (error?.code === "P2002") {
                set.status = 409;
                return { success: false, message: "Email already exists" };
              }

              console.error("Customer register error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

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
          }),
        },
        (guardApp: any) =>
          guardApp.post(
            "/register/admin",
            async ({ headers, body, set }: any) => {
              try {
                const auth = verifyAuth(headers);
                if (!auth.valid) {
                  set.status = 403;
                  return { success: false, message: auth.error };
                }

                if (!hasPermission(auth.user!.type, [UserType.admin])) {
                  set.status = 403;
                  return {
                    success: false,
                    message: "Only admins can create admin accounts",
                  };
                }

                const hashedPassword = await Bun.password.hash(body.password, {
                  algorithm: "bcrypt",
                  cost: 10,
                });

                const result = await userController.createUser({
                  u_email: body.email,
                  u_password: hashedPassword,
                  u_type: UserType.admin,
                });

                return {
                  success: true,
                  message: "Admin registered successfully",
                  result,
                };
              } catch (error: any) {
                if (error?.code === "P2002") {
                  set.status = 409;
                  return { success: false, message: "Email already exists" };
                }

                console.error("Admin register error:", error);
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            }
          )
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
        (guardApp: any) =>
          guardApp.put(
            "/:id/change-password",
            async ({ headers, params, body, set }: any) => {
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
                const hashedPassword = await Bun.password.hash(
                  body.new_password,
                  {
                    algorithm: "bcrypt",
                    cost: 10,
                  }
                );

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
        (guardApp: any) =>
          guardApp.put("/:id", async ({ headers, params, body, set }: any) => {
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

              const user = await userController.updateUser(
                params.id,
                updateData
              );

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
        (guardApp: any) =>
          guardApp.delete("/:id", async ({ headers, params, set }: any) => {
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
              if (
                error instanceof Error &&
                error.message === "User not found"
              ) {
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
      )
  );
}
