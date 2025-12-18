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
          om_price: true,
          om_stock: true,
          om_is_selling: true,

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

      if (!result) return null;

      const cleanedMenu = removeColumnPrefix(result.menu);

      return {
        id: result.om_id,
        price: result.om_price,
        stock: result.om_stock,
        is_selling: result.om_is_selling,

        menu: {
          ...cleanedMenu,
          menu_subitem_childs:
            cleanedMenu.menu_subitem_childs?.map((msc: any) => ({
              subitem: removeColumnPrefix(msc.subitem),
            })) ?? [],
        },
      };
    } catch (error) {
      console.error("getOutletMenuById error:", error);
      throw error;
    }
  },

  // GET OUTLET MENU BY OUTLET ID — GROUPED BY CATEGORY (CUSTOM SHAPE)
  getOutletMenusByOutletId: async (outletId: number) => {
    try {
      const result = await db.outlet_menu.findMany({
        where: {
          om_o_id: outletId,
          om_is_deleted: false,
          om_is_selling: true,
          menu: {
            m_is_deleted: false,
          },
        },
        orderBy: {
          menu: {
            m_name: "asc",
          },
        },
        select: {
          om_id: true,
          om_o_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,

          menu: {
            select: {
              m_id: true,
              m_sku: true,
              m_name: true,
              m_desc: true,
              m_category: true,
              m_picture_url: true,
              m_picture_path: true,
              m_is_subitem: true,
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

      // 🔹 GROUP BY CATEGORY & RESHAPE
      const grouped = result.reduce((acc, item) => {
        const category = item.menu.m_category || "Uncategorized";

        if (!acc[category]) {
          acc[category] = {
            category,
            menus: [],
          };
        }

        acc[category].menus.push({
          id: item.om_id, // outlet_menu id
          o_id: item.om_o_id, // outlet id
          price: item.om_price,
          stock: item.om_stock,
          is_selling: item.om_is_selling,

          ...removeColumnPrefix(item.menu),
        });

        return acc;
      }, {} as Record<string, { category: string; menus: any[] }>);

      return {
        data: Object.values(grouped),
      };
    } catch (error) {
      console.error("getOutletMenusByOutletId error:", error);
      throw error;
    }
  },

  // GET OUTLET MENU BY PARENT MENU ID
  getOutletMenuByParentIdAndOutletId: async (
    parentMenuId: number,
    outletId: number
  ) => {
    try {
      const outletMenus = await db.outlet_menu.findMany({
        where: {
          om_m_id: parentMenuId,
          om_o_id: outletId,
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
              m_is_subitem: true,
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
      return outletMenus.map((item) => removeColumnPrefix(item));
    } catch (error) {
      console.error("getOutletMenuByParentIdAndOutletId error:", error);
      throw error;
    }
  },

  // SEARCH OUTLET MENUS
  searchOutletMenusByOutletId: async (outlet_id: number, keyword?: string) => {
    try {
      const result = await db.outlet_menu.findMany({
        where: {
          om_o_id: outlet_id,
          om_is_deleted: false,
          om_is_selling: true,

          menu: {
            m_is_deleted: false,

            ...(keyword && {
              OR: [
                { m_name: { contains: keyword } },
                { m_desc: { contains: keyword } },
              ],
            }),
          },
        },

        orderBy: {
          menu: {
            m_name: "asc",
          },
        },

        select: {
          om_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,

          menu: {
            select: {
              m_id: true,
              m_sku: true,
              m_name: true,
              m_desc: true,
              m_category: true,
              m_picture_url: true,
              m_picture_path: true,
              m_is_subitem: true,

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

      return result.map((item) => ({
        id: item.om_id,
        price: item.om_price,
        stock: item.om_stock,
        is_selling: item.om_is_selling,

        menu: {
          ...removeColumnPrefix(item.menu),
        },
      }));
    } catch (error) {
      console.error("searchOutletMenusByOutletId error:", error);
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
