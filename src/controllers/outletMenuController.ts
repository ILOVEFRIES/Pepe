import { PrismaClient } from "@prisma/client";
import { removeColumnPrefix } from "../util/removeColumnPrefix";

const db = new PrismaClient();

export const outletMenuController = {
  // GET ALL OUTLET MENUS (NOT DELETED)
  getOutletMenus: async () => {
    try {
      const result = await db.outlet_menu.findMany({
        where: {
          om_is_deleted: false,
        },
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_created_at: true,
          om_updated_at: true,

          menu: {
            select: {
              m_id: true,
              m_sku: true,
              m_name: true,
              m_desc: true,
              m_category: true,
              m_picture_url: true,
              m_picture_path: true,

              menu_subitem_childs: {
                select: {
                  subitem: {
                    select: {
                      m_id: true,
                      m_sku: true,
                      m_name: true,
                      m_desc: true,
                      m_category: true,
                      m_picture_url: true,
                      m_picture_path: true,
                      m_is_deleted: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return result.map((item) => removeColumnPrefix(item));
    } catch (error) {
      console.error("getOutletMenus error:", error);
      throw error;
    }
  },

  // GET OUTLET MENU BY ID
  getOutletMenuById: async (id: number) => {
    try {
      const result = await db.outlet_menu.findFirst({
        where: {
          om_id: id,
          om_is_deleted: false,
        },
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_created_at: true,
          om_updated_at: true,
        },
      });

      return result ? removeColumnPrefix(result) : null;
    } catch (error) {
      console.error("getOutletMenuById error:", error);
      throw error;
    }
  },

  // GET OUTLET MENU BY ID
  getOutletMenusByOutletId: async (outletId: number) => {
    try {
      const result = await db.outlet_menu.findMany({
        where: {
          om_o_id: outletId,
          om_is_deleted: false,
          menu: {
            m_is_deleted: false,
          },
        },
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_created_at: true,
          om_updated_at: true,

          menu: {
            select: {
              m_id: true,
              m_sku: true,
              m_name: true,
              m_desc: true,
              m_category: true,
              m_picture_url: true,
              m_picture_path: true,

              menu_subitem_childs: {
                select: {
                  subitem: {
                    select: {
                      m_id: true,
                      m_sku: true,
                      m_name: true,
                      m_desc: true,
                      m_category: true,
                      m_picture_url: true,
                      m_picture_path: true,
                      m_is_deleted: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // CLEAN & FLATTEN RESPONSE
      return result.map((item) => {
        const cleaned = removeColumnPrefix(item);

        return {
          ...cleaned,
          menu: {
            ...removeColumnPrefix(cleaned.menu),
            subitems: cleaned.menu.menu_subitem_childs
              .filter((ms: any) => !ms.subitem.m_is_deleted)
              .map((ms: any) => removeColumnPrefix(ms.subitem)),
          },
        };
      });
    } catch (error) {
      console.error("getOutletMenusByOutletId error:", error);
      throw error;
    }
  },

  // CREATE OUTLET MENU
  createOutletMenu: async (data: {
    om_m_id: number;
    om_o_id: number;
    om_price: number;
    om_stock?: number;
    om_is_selling?: boolean;
  }) => {
    try {
      const created = await db.outlet_menu.create({
        data: {
          om_m_id: data.om_m_id,
          om_o_id: data.om_o_id,
          om_price: data.om_price,

          ...(data.om_stock !== undefined && {
            om_stock: data.om_stock,
          }),

          om_is_selling: data.om_is_selling ?? true,
        },
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_created_at: true,
          om_updated_at: true,
        },
      });

      return removeColumnPrefix(created);
    } catch (error) {
      console.error("createOutletMenu error:", error);
      throw error;
    }
  },

  // UPDATE OUTLET MENU
  updateOutletMenu: async (
    id: number,
    data: Partial<{
      om_price: number;
      om_stock: number;
      om_is_selling: boolean;
      om_is_deleted: boolean;
    }>
  ) => {
    try {
      const updated = await db.outlet_menu.update({
        where: { om_id: id },
        data,
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_is_deleted: true,
          om_created_at: true,
          om_updated_at: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("updateOutletMenu error:", error);
      throw error;
    }
  },

  // TOGGLE OUTLET MENU DELETE STATUS
  toggleOutletMenuDelete: async (id: number) => {
    try {
      const outletMenu = await db.outlet_menu.findUnique({
        where: { om_id: id },
        select: { om_is_deleted: true },
      });

      if (!outletMenu) throw new Error("Outlet menu not found");

      const updated = await db.outlet_menu.update({
        where: { om_id: id },
        data: {
          om_is_deleted: !outletMenu.om_is_deleted,
        },
        select: {
          om_id: true,
          om_m_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_is_deleted: true,
          om_created_at: true,
          om_updated_at: true,
        },
      });

      return removeColumnPrefix(updated);
    } catch (error) {
      console.error("toggleOutletMenuDelete error:", error);
      throw error;
    }
  },
};
