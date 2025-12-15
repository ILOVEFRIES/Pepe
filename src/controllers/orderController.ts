import { PrismaClient } from "@prisma/client";
import { removeColumnPrefix } from "../util/removeColumnPrefix";
import { ulid } from "ulid";
import parseOrderItem from "../util/parseOrderItem";

const db = new PrismaClient();

export const orderController = {
  // GET ALL ORDERS (optionally filter by outlet)
  getOrders: async (filters?: { outlet_id?: number; user_id?: number }) => {
    try {
      const result = await db.order.findMany({
        where: {
          ...(filters?.outlet_id !== undefined && {
            or_o_id: filters.outlet_id,
          }),
          ...(filters?.user_id !== undefined && {
            or_u_id: filters.user_id,
          }),
        },
        select: {
          or_id: true,
          or_uid: true,
          or_o_id: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,
        },
        orderBy: {
          or_id: "desc",
        },
      });

      return result.map((order) => removeColumnPrefix(parseOrderItem(order)));
    } catch (error) {
      console.error("getOrders error:", error);
      throw error;
    }
  },

  // GET ORDER BY ID
  getOrderById: async (id: number) => {
    try {
      const result = await db.order.findFirst({
        where: {
          or_id: id,
        },
        select: {
          or_id: true,
          or_uid: true,
          or_o_id: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,

          outlet: {
            select: {
              o_id: true,
              o_name: true,
            },
          },
          user: {
            select: {
              u_id: true,
              u_email: true,
            },
          },
        },
      });

      return result ? removeColumnPrefix(parseOrderItem(result)) : null;
    } catch (error) {
      console.error("getOrderById error:", error);
      throw error;
    }
  },

  // GET ORDERS BY OUTLET ID
  getOrdersByOutletId: async (outletId: number) => {
    try {
      const result = await db.order.findMany({
        where: {
          or_o_id: outletId,
        },
        select: {
          or_id: true,
          or_uid: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,
          or_created_at: true,
        },
        orderBy: {
          or_created_at: "desc",
        },
      });

      return result.map((order) => removeColumnPrefix(parseOrderItem(order)));
    } catch (error) {
      console.error("getOrdersByOutletId error:", error);
      throw error;
    }
  },

  // CREATE ORDER
  createOrder: async (data: {
    or_o_id: number;
    or_table_no: string;
    or_u_id: number;
    or_tax: number;
    or_sc: number;
    or_subtotal: number;
    or_grand_total: number;
    or_order_item: string;
  }) => {
    try {
      const created = await db.order.create({
        data: {
          or_uid: ulid(),
          or_o_id: data.or_o_id,
          or_table_no: data.or_table_no,
          or_u_id: data.or_u_id,
          or_tax: data.or_tax,
          or_sc: data.or_sc,
          or_subtotal: data.or_subtotal,
          or_grand_total: data.or_grand_total,
          or_order_item: data.or_order_item,
        },
        select: {
          or_id: true,
          or_uid: true,
          or_o_id: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,
        },
      });

      return removeColumnPrefix(created);
    } catch (error) {
      console.error("createOrder error:", error);
      throw error;
    }
  },

  // GET ORDER BY UID
  getOrderByUid: async (uid: string) => {
    try {
      const result = await db.order.findFirst({
        where: {
          or_uid: uid,
        },
        select: {
          or_id: true,
          or_uid: true,
          or_o_id: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,
          or_created_at: true,

          outlet: {
            select: {
              o_id: true,
              o_name: true,
            },
          },
          user: {
            select: {
              u_id: true,
              u_email: true,
            },
          },
        },
      });

      if (!result) return null;

      return removeColumnPrefix(parseOrderItem(result));
    } catch (error) {
      console.error("getOrderByUid error:", error);
      throw error;
    }
  },

  // UPDATE ORDER (partial)
  updateOrder: async (
    id: number,
    data: Partial<{
      or_table_no: string;
      or_tax: number;
      or_sc: number;
      or_subtotal: number;
      or_grand_total: number;
      or_order_item: string;
    }>
  ) => {
    try {
      const updated = await db.order.update({
        where: { or_id: id },
        data,
        select: {
          or_id: true,
          or_uid: true,
          or_o_id: true,
          or_table_no: true,
          or_u_id: true,
          or_tax: true,
          or_sc: true,
          or_subtotal: true,
          or_grand_total: true,
          or_order_item: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("updateOrder error:", error);
      throw error;
    }
  },
};
