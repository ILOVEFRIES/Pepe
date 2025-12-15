import { PrismaClient } from "@prisma/client";
import removeColumnPrefix from "../util/removeColumnPrefix";

const db = new PrismaClient();

export const menuSubitemController = {
  // GET ALL SUBITEMS FOR A PARENT MENU
  getSubitemsForMenu: async (parentId: number) => {
    try {
      const result = await db.menu_subitem.findMany({
        where: {
          ms_parent_id: parentId,
        },
        select: {
          ms_id: true,
          ms_parent_id: true,
          ms_subitem_id: true,
          subitem: {
            select: {
              m_id: true,
              m_sku: true,
              m_name: true,
              m_desc: true,
              m_picture_url: true,
              m_category: true,
            },
          },
        },
      });

      return result.map((item) => removeColumnPrefix(item));
    } catch (error) {
      console.error("getSubitemsForMenu error:", error);
      throw error;
    }
  },

  // ADD SUBITEM TO MENU
  addMenuSubitems: async (data: { parentId: number; subitemIds: number[] }) => {
    try {
      if (data.subitemIds.length === 0) {
        throw new Error("No subitems provided");
      }

      // Validate parent + subitems exist and not deleted
      const menus = await db.menu.findMany({
        where: {
          m_id: { in: [data.parentId, ...data.subitemIds] },
          m_is_deleted: false,
        },
        select: { m_id: true },
      });

      if (menus.length !== data.subitemIds.length + 1) {
        throw new Error("One or more menu items not found or deleted");
      }

      // Prevent duplicates
      const existing = await db.menu_subitem.findMany({
        where: {
          ms_parent_id: data.parentId,
          ms_subitem_id: { in: data.subitemIds },
        },
        select: { ms_subitem_id: true },
      });

      const existingIds = new Set(existing.map((e) => e.ms_subitem_id));
      const toCreate = data.subitemIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({
          ms_parent_id: data.parentId,
          ms_subitem_id: id,
        }));

      if (toCreate.length === 0) {
        return [];
      }

      await db.menu_subitem.createMany({
        data: toCreate,
        skipDuplicates: true, // safety
      });

      return toCreate.map(removeColumnPrefix);
    } catch (error) {
      console.error("addMenuSubitems error:", error);
      throw error;
    }
  },

  // REMOVE SUBITEM FROM MENU
  removeMenuSubitem: async (id: number) => {
    try {
      const subitem = await db.menu_subitem.findUnique({
        where: { ms_id: id },
      });

      if (!subitem) {
        throw new Error("Menu subitem relationship not found");
      }

      const deleted = await db.menu_subitem.delete({
        where: { ms_id: id },
        select: {
          ms_id: true,
        },
      });

      return removeColumnPrefix(deleted);
    } catch (error) {
      console.error("removeMenuSubitem error:", error);
      throw error;
    }
  },
};
