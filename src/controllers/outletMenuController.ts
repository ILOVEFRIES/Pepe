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

  // GET OUTLET MENU BY OUTLET ID
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
      const cleanedMenus = result.map((item) => {
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

      type GroupedMenus = {
        category: string;
        menus: typeof cleanedMenus;
      };

      const normalizeCategory = (c?: string) => c?.trim() || "Uncategorized";

      // Use Map instead of plain object to avoid object injection warnings
      const groupedMap = new Map<string, typeof cleanedMenus>();

      cleanedMenus.forEach((item) => {
        const category = normalizeCategory(item.menu.category);
        const arr = groupedMap.get(category) ?? [];
        arr.push(item);
        groupedMap.set(category, arr);
      });

      // Convert Map to array and sort
      const groupedArray: GroupedMenus[] = Array.from(groupedMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, menus]) => ({
          category,
          menus: menus.sort((a, b) =>
            a.menu.m_name.localeCompare(b.menu.m_name)
          ),
        }));

      return groupedArray;
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
  searchOutletMenus: async (params: {
    outlet_id: number;
    keyword?: string;
    category?: string;
    is_selling?: boolean;
  }) => {
    try {
      const keyword = params.keyword?.trim().length
        ? params.keyword.trim()
        : undefined;

      const result = await db.outlet_menu.findMany({
        where: {
          om_o_id: params.outlet_id,
          om_is_deleted: false,

          ...(params.is_selling !== undefined && {
            om_is_selling: params.is_selling,
          }),

          menu: {
            is: {
              m_is_deleted: false,
              m_is_subitem: false,

              ...(params.category && {
                m_category: params.category,
              }),

              ...(keyword && {
                OR: [{ m_name: { contains: keyword } }],
              }),
            },
          },
        },

        orderBy: [
          { om_is_selling: "desc" }, // selling first
          { om_stock: "desc" }, // in-stock first
          { menu: { m_name: "asc" } },
        ],

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
            },
          },
        },
      });

      // CLEAN & FLATTEN
      const cleanedMenus = result.map((item) => {
        const cleaned = removeColumnPrefix(item);
        return {
          ...cleaned,
          menu: removeColumnPrefix(item.menu),
        };
      });

      type GroupedMenus = {
        category: string;
        menus: typeof cleanedMenus;
      };

      const normalizeCategory = (c?: string) => c?.trim() || "Uncategorized";

      // Use Map instead of plain object to avoid object injection warnings
      const groupedMap = new Map<string, typeof cleanedMenus>();

      cleanedMenus.forEach((item) => {
        const category = normalizeCategory(item.menu.category);
        const arr = groupedMap.get(category) ?? [];
        arr.push(item);
        groupedMap.set(category, arr);
      });

      // Convert Map to array and sort
      const groupedArray: GroupedMenus[] = Array.from(groupedMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, menus]) => ({
          category,
          menus: menus.sort((a, b) =>
            a.menu.m_name.localeCompare(b.menu.m_name)
          ),
        }));

      return groupedArray;
    } catch (error) {
      console.error("searchOutletMenus error:", error);
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
