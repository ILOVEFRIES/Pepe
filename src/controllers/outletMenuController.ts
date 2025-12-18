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

  // GET OUTLET MENU BY OUTLET ID
  getOutletMenusByOutletId: async (outletId: number) => {
    try {
      const outletMenus = await db.outlet_menu.findMany({
        where: {
          om_o_id: outletId,
          om_is_deleted: false,
          menu: {
            m_is_deleted: false,
            m_is_subitem: false,
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

              menu_subitem_childs: {
                select: {
                  ms_subitem_id: true,
                  subitem: {
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
              },
            },
          },
        },
      });

      const subitemIds = Array.from(
        new Set(
          outletMenus.flatMap((om) =>
            om.menu.menu_subitem_childs.map((c) => c.ms_subitem_id)
          )
        )
      );

      const subitemPrices =
        subitemIds.length > 0
          ? await db.outlet_menu.findMany({
              where: {
                om_o_id: outletId,
                om_m_id: { in: subitemIds },
                om_is_deleted: false,
              },
              select: {
                om_m_id: true,
                om_price: true,
                om_stock: true,
                om_is_selling: true,
              },
            })
          : [];

      const priceMap = new Map<
        number,
        { price: number; stock: number | null; is_selling: boolean }
      >(
        subitemPrices.map((p) => [
          p.om_m_id,
          {
            price: p.om_price,
            stock: p.om_stock,
            is_selling: p.om_is_selling,
          },
        ])
      );

      const normalizedMenus = outletMenus.map((item) => {
        const cleanMenu = removeColumnPrefix(item.menu);

        const subitemChilds = cleanMenu.subitem_childs ?? [];
        delete cleanMenu.subitem_childs;

        return {
          id: item.om_id,
          m_id: cleanMenu.id,
          o_id: outletId,
          price: item.om_price,
          stock: item.om_stock,
          is_selling: item.om_is_selling,

          ...cleanMenu,

          subitems: subitemChilds.map((msc: any) => {
            const sub = removeColumnPrefix(msc.subitem);
            const price = priceMap.get(sub.id);

            return {
              ...sub,
              price: price?.price ?? null,
              stock: price?.stock ?? null,
              is_selling: price?.is_selling ?? false,
            };
          }),
        };
      });

      const groupedByCategory = Object.values(
        normalizedMenus.reduce((acc: any, menu) => {
          const category = menu.category ?? "Uncategorized";

          if (!acc[category]) {
            acc[category] = {
              category,
              menus: [],
            };
          }

          acc[category].menus.push(menu);
          return acc;
        }, {})
      );

      return groupedByCategory;
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
  searchOutletMenus: async (params: {
    outlet_id: number;
    keyword?: string;
    category?: string;
  }) => {
    try {
      const keyword = params.keyword?.trim() || undefined;

      // 1️⃣ Fetch main menus (exclude subitems)
      const mainMenus = await db.outlet_menu.findMany({
        where: {
          om_o_id: params.outlet_id,
          om_is_deleted: false,
          om_is_selling: true,
          menu: {
            is: {
              m_is_deleted: false,
              m_is_subitem: false, // main menus only
              ...(params.category && { m_category: params.category }),
              ...(keyword && { OR: [{ m_name: { contains: keyword } }] }),
            },
          },
        },
        orderBy: [
          { om_is_selling: "desc" },
          { om_stock: "desc" },
          { menu: { m_name: "asc" } },
        ],
        select: {
          om_id: true,
          om_price: true,
          om_stock: true,
          om_is_selling: true,
          om_m_id: true,
          om_o_id: true,
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
                  ms_subitem_id: true,
                  subitem: {
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
              },
            },
          },
        },
      });

      // 2️⃣ Collect all subitem IDs to fetch outlet-specific prices
      const subitemIds = Array.from(
        new Set(
          mainMenus.flatMap(
            (om) =>
              om.menu.menu_subitem_childs?.map((c) => c.ms_subitem_id) || []
          )
        )
      );

      const subitemPrices =
        subitemIds.length > 0
          ? await db.outlet_menu.findMany({
              where: {
                om_o_id: params.outlet_id,
                om_m_id: { in: subitemIds },
                om_is_deleted: false,
              },
              select: {
                om_m_id: true,
                om_price: true,
                om_stock: true,
                om_is_selling: true,
              },
            })
          : [];

      const priceMap = new Map<
        number,
        { price: number; stock: number | null; is_selling: boolean }
      >(
        subitemPrices.map((p) => [
          p.om_m_id,
          { price: p.om_price, stock: p.om_stock, is_selling: p.om_is_selling },
        ])
      );

      // 3️⃣ Normalize menus and attach subitems
      const normalizedMenus = mainMenus.map((item) => {
        const cleanMenu = removeColumnPrefix(item.menu);
        const subitemChilds = cleanMenu.subitem_childs ?? [];
        delete cleanMenu.subitem_childs;

        return {
          id: item.om_id,
          m_id: cleanMenu.id,
          o_id: item.om_o_id,
          price: item.om_price,
          stock: item.om_stock,
          is_selling: item.om_is_selling,
          ...cleanMenu,

          subitems: subitemChilds.map((msc: any) => {
            const sub = removeColumnPrefix(msc.subitem);
            const price = priceMap.get(sub.id);

            return {
              ...sub,
              price: price?.price ?? null,
              stock: price?.stock ?? null,
              is_selling: price?.is_selling ?? false,
            };
          }),
        };
      });

      // 4️⃣ Group by category
      const groupedByCategory = Object.values(
        normalizedMenus.reduce((acc: any, menu) => {
          const category = menu.category ?? "Uncategorized";

          if (!acc[category]) {
            acc[category] = {
              category,
              menus: [],
            };
          }

          acc[category].menus.push(menu);
          return acc;
        }, {})
      );

      return groupedByCategory;
    } catch (error) {
      console.error("searchOutletMenus error:", error);
      throw error;
    }
  },

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
