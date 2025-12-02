import { PrismaClient, UserType } from "@prisma/client";
import removeColumnPrefix from "../util/removeColumnPrefix";

const db = new PrismaClient();

export const userController = {
  // GET ALL USERS
  getUsers: async () => {
    try {
      const result = await db.user.findMany({
        where: {
          u_is_deleted: false,
        },
        select: {
          u_id: true,
          u_email: true,
          u_type: true,
          u_created_at: true,
          u_updated_at: true,
        },
      });

      return result.map((user) => removeColumnPrefix(user));
    } catch (error) {
      console.error("getUsers error:", error);
      throw error;
    }
  },

  // GET USER BY ID
  getUserById: async (id: number) => {
    try {
      const result = await db.user.findFirst({
        where: {
          u_id: id,
          u_is_deleted: false,
        },
        select: {
          u_id: true,
          u_email: true,
          u_type: true,
          u_created_at: true,
          u_updated_at: true,
        },
      });

      return result ? removeColumnPrefix(result) : null;
    } catch (error) {
      console.error("getUserById error:", error);
      throw error;
    }
  },

  // CREATE USER
  createUser: async (data: {
    u_email: string;
    u_password: string;
    u_type: UserType;
  }) => {
    try {
      const created = await db.user.create({
        data: {
          u_email: data.u_email,
          u_password: data.u_password,
          u_type: data.u_type,
        },
        select: {
          u_id: true,
          u_email: true,
          u_type: true,
          u_created_at: true,
          u_updated_at: true,
        },
      });

      return removeColumnPrefix(created);
    } catch (error) {
      console.error("createUser error:", error);
      throw error;
    }
  },

  // UPDATE USER
  updateUser: async (
    id: number,
    data: Partial<{
      u_email: string;
      u_type: UserType;
      u_password: string;
      u_is_deleted: boolean;
    }>
  ) => {
    try {
      const updated = await db.user.update({
        where: { u_id: id },
        data,
        select: {
          u_id: true,
          u_email: true,
          u_type: true,
          u_created_at: true,
          u_updated_at: true,
          u_is_deleted: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("updateUser error:", error);
      throw error;
    }
  },

  // TOGGLE USER DELETE STATUS
  toggleUserDelete: async (id: number) => {
    try {
      const user = await db.user.findUnique({
        where: { u_id: id },
        select: { u_is_deleted: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const updated = await db.user.update({
        where: { u_id: id },
        data: {
          u_is_deleted: !user.u_is_deleted,
        },
        select: {
          u_id: true,
          u_email: true,
          u_type: true,
          u_is_deleted: true,
          u_created_at: true,
          u_updated_at: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("toggleUserDelete error:", error);
      throw error;
    }
  },
};
