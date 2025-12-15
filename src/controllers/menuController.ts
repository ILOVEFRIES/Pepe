import { PrismaClient } from "@prisma/client";
import removeColumnPrefix from "../util/removeColumnPrefix";

const db = new PrismaClient();

export const menuController = {
  // GET ALL MENUS
  getMenus: async () => {
    try {
      const result = await db.menu.findMany({
        where: {
          m_is_deleted: false,
        },
        select: {
          m_id: true,
          m_sku: true,
          m_name: true,
          m_desc: true,
          m_picture_url: true,
          m_picture_path: true,
          m_category: true,
        },
      });

      return result.map(removeColumnPrefix);
    } catch (error) {
      console.error("getMenus error:", error);
      throw error;
    }
  },

  // GET MENU BY ID
  getMenuById: async (id: number) => {
    try {
      const result = await db.menu.findFirst({
        where: {
          m_id: id,
          m_is_deleted: false,
        },
        select: {
          m_id: true,
          m_sku: true,
          m_name: true,
          m_desc: true,
          m_picture_url: true,
          m_picture_path: true,
          m_category: true,
        },
      });

      return result ? removeColumnPrefix(result) : null;
    } catch (error) {
      console.error("getMenuById error:", error);
      throw error;
    }
  },

  // CREATE MENU
  createMenu: async (data: {
    m_sku: string;
    m_name: string;
    m_desc: string;
    m_picture_url?: string;
    m_picture_path?: string;
    m_category: string;
  }) => {
    try {
      const created = await db.menu.create({
        data: {
          m_sku: data.m_sku,
          m_name: data.m_name,
          m_desc: data.m_desc,
          m_picture_url: data.m_picture_url ?? null,
          m_picture_path: data.m_picture_path ?? null,
          m_category: data.m_category,
        },
        select: {
          m_id: true,
          m_sku: true,
          m_name: true,
          m_desc: true,
          m_picture_url: true,
          m_picture_path: true,
          m_category: true,
        },
      });

      return removeColumnPrefix(created);
    } catch (error) {
      console.error("createMenu error:", error);
      throw error;
    }
  },

  // UPDATE MENU
  updateMenu: async (
    id: number,
    data: Partial<{
      m_sku: string;
      m_name: string;
      m_desc: string;
      m_picture_url?: string;
      m_picture_path?: string;
      m_category: string;
    }>
  ) => {
    try {
      const updated = await db.menu.update({
        where: { m_id: id },
        data: {
          ...(data.m_sku && { m_sku: data.m_sku }),
          ...(data.m_name && { m_name: data.m_name }),
          ...(data.m_desc && { m_desc: data.m_desc }),
          ...(data.m_picture_url !== undefined && {
            m_picture_url: data.m_picture_url,
          }),
          ...(data.m_picture_path !== undefined && {
            m_picture_path: data.m_picture_path,
          }),
          ...(data.m_category && { m_category: data.m_category }),
        },
        select: {
          m_id: true,
          m_sku: true,
          m_name: true,
          m_desc: true,
          m_picture_url: true,
          m_picture_path: true,
          m_category: true,
          m_is_deleted: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("updateMenu error:", error);
      throw error;
    }
  },

  // TOGGLE MENU DELETE STATUS (soft delete)
  toggleMenuDelete: async (id: number) => {
    try {
      const menu = await db.menu.findUnique({
        where: { m_id: id },
        select: {
          m_is_deleted: true,
        },
      });

      if (!menu) throw new Error("Menu not found");

      const updated = await db.menu.update({
        where: { m_id: id },
        data: {
          m_is_deleted: !menu.m_is_deleted,
        },
        select: {
          m_id: true,
          m_sku: true,
          m_name: true,
          m_desc: true,
          m_picture_url: true,
          m_picture_path: true,
          m_category: true,
          m_is_deleted: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("toggleMenuDelete error:", error);
      throw error;
    }
  },
};
