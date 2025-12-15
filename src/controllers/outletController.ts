import { PrismaClient } from "@prisma/client";
import { removeColumnPrefix } from "../util/removeColumnPrefix";

const db = new PrismaClient();

export const outletController = {
  // GET ALL OUTLETS
  getOutlets: async () => {
    try {
      const result = await db.outlet.findMany({
        where: {
          o_is_deleted: false,
        },
        select: {
          o_id: true,
          o_name: true,
          o_u_id: true,
          o_tax: true,
          o_sc: true,
          o_created_at: true,
          o_updated_at: true,
        },
      });

      return result.map((outlet) => removeColumnPrefix(outlet));
    } catch (error) {
      console.error("getOutlets error:", error);
      throw error;
    }
  },

  // GET OUTLET BY ID
  getOutletById: async (id: number) => {
    try {
      const result = await db.outlet.findFirst({
        where: {
          o_id: id,
          o_is_deleted: false,
        },
        select: {
          o_id: true,
          o_name: true,
          o_u_id: true,
          o_tax: true,
          o_sc: true,
          o_created_at: true,
          o_updated_at: true,
        },
      });

      return result ? removeColumnPrefix(result) : null;
    } catch (error) {
      console.error("getOutletById error:", error);
      throw error;
    }
  },

  // CREATE OUTLET
  createOutlet: async (data: {
    o_name: string;
    o_u_id: number;
    o_tax: number;
    o_sc: number;
  }) => {
    try {
      const created = await db.outlet.create({
        data: {
          o_name: data.o_name,
          o_u_id: data.o_u_id,
          o_tax: data.o_tax,
          o_sc: data.o_sc,
        },
        select: {
          o_id: true,
          o_name: true,
          o_u_id: true,
          o_tax: true,
          o_sc: true,
          o_created_at: true,
          o_updated_at: true,
        },
      });

      return removeColumnPrefix(created);
    } catch (error) {
      console.error("createOutlet error:", error);
      throw error;
    }
  },

  // UPDATE OUTLET
  updateOutlet: async (
    id: number,
    data: Partial<{
      o_name: string;
      o_u_id: number;
      o_tax: number;
      o_sc: number;
      o_is_deleted: boolean;
    }>
  ) => {
    try {
      const updated = await db.outlet.update({
        where: { o_id: id },
        data,
        select: {
          o_id: true,
          o_name: true,
          o_u_id: true,
          o_tax: true,
          o_sc: true,
          o_created_at: true,
          o_updated_at: true,
          o_is_deleted: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("updateOutlet error:", error);
      throw error;
    }
  },

  // TOGGLE OUTLET DELETE STATUS
  toggleOutletDelete: async (id: number) => {
    try {
      const outlet = await db.outlet.findUnique({
        where: { o_id: id },
        select: { o_is_deleted: true },
      });

      if (!outlet) throw new Error("Outlet not found");

      const updated = await db.outlet.update({
        where: { o_id: id },
        data: {
          o_is_deleted: !outlet.o_is_deleted,
        },
        select: {
          o_id: true,
          o_name: true,
          o_u_id: true,
          o_tax: true,
          o_sc: true,
          o_is_deleted: true,
          o_created_at: true,
          o_updated_at: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("toggleOutletDelete error:", error);
      throw error;
    }
  },
};
