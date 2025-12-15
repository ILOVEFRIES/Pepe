import { t } from "elysia";
import { orderController } from "../controllers/orderController";
import formatGrandTotal from "../util/formatGrandTotal";
import { UserType } from "@prisma/client";
import { rateLimit } from "elysia-rate-limit";
import { verifyAuth, hasPermission } from "../middleware/auth";
import { Prisma, PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

// ORDER ROUTES
export function orderRoutes(app: any) {
  return (
    app
      .use(
        rateLimit({
          duration: 60000,
          max: 100,
        })
      )

      // GET ALL ORDERS (Admin only)
      .guard({}, (guardApp: any) =>
        guardApp.get("/", async ({ headers, set }: any) => {
          const auth = verifyAuth(headers);

          if (!auth.valid) {
            set.status = 403;
            return { success: false, message: auth.error };
          }

          if (!hasPermission(auth.user!.type, [UserType.admin])) {
            set.status = 403;
            return { success: false, message: "Insufficient permissions" };
          }

          try {
            const data = await orderController.getOrders();
            return { success: true, data };
          } catch (error) {
            console.error("Get orders error:", error);
            set.status = 500;
            return { success: false, message: "Something went wrong" };
          }
        })
      )

      // GET ORDER BY ID (Admin only)
      .guard(
        {
          params: t.Object({
            id: t.Numeric(),
          }),
        },
        (guardApp: any) =>
          guardApp.get("/:id", async ({ headers, params, set }: any) => {
            const auth = verifyAuth(headers);

            if (!auth.valid) {
              set.status = 403;
              return { success: false, message: auth.error };
            }

            if (!hasPermission(auth.user!.type, [UserType.admin])) {
              set.status = 403;
              return { success: false, message: "Insufficient permissions" };
            }

            try {
              const order = await orderController.getOrderById(params.id);

              if (!order) {
                set.status = 404;
                return { success: false, message: "Order not found" };
              }

              return { success: true, data: order };
            } catch (error) {
              console.error("Get order error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )

      // GET ORDERS BY OUTLET ID (Admin only)
      .guard(
        {
          body: t.Object({
            outlet_id: t.Numeric(),
            table_no: t.String(),
            user_id: t.Numeric(),
            order_item: t.Array(
              t.Object({
                menu_id: t.Numeric(),
                quantity: t.Numeric(),
              })
            ),
          }),
        },
        (guardApp: any) =>
          guardApp.post("/", async ({ headers, body, set }: any) => {
            const auth = verifyAuth(headers);

            if (!auth.valid) {
              set.status = 403;
              return { success: false, message: auth.error };
            }

            if (
              !hasPermission(auth.user!.type, [
                UserType.admin,
                UserType.customer,
              ])
            ) {
              set.status = 403;
              return { success: false, message: "Insufficient permissions" };
            }

            try {
              const result = await db.$transaction(async (tx) => {
                // GET OUTLET (TAX & SC)
                const outlet = await tx.outlet.findUnique({
                  where: { o_id: body.outlet_id },
                  select: { o_tax: true, o_sc: true },
                });

                if (!outlet) throw new Error("Outlet not found");

                let subtotal = 0;
                const detailedItems: any[] = [];

                // PRICE + STOCK CHECK & DEDUCTION
                for (const item of body.order_item) {
                  const outletMenu = await tx.outlet_menu.findFirst({
                    where: {
                      om_m_id: item.menu_id,
                      om_o_id: body.outlet_id,
                      om_is_deleted: false,
                    },
                    select: {
                      om_id: true,
                      om_price: true,
                      om_stock: true,
                    },
                  });

                  if (!outletMenu) {
                    throw new Error(`Menu ${item.menu_id} not available`);
                  }

                  // STOCK CHECK
                  if (
                    outletMenu.om_stock !== null &&
                    outletMenu.om_stock < item.quantity
                  ) {
                    throw new Error(
                      `Insufficient stock for menu ${item.menu_id}`
                    );
                  }

                  // DEDUCT STOCK (ONLY IF NOT NULL)
                  if (outletMenu.om_stock !== null) {
                    await tx.outlet_menu.update({
                      where: { om_id: outletMenu.om_id },
                      data: {
                        om_stock: outletMenu.om_stock - item.quantity,
                      },
                    });
                  }

                  const itemTotal = outletMenu.om_price * item.quantity;
                  subtotal += itemTotal;

                  detailedItems.push({
                    menu_id: item.menu_id,
                    quantity: item.quantity,
                    price: outletMenu.om_price,
                    total: itemTotal,
                  });
                }

                // SERVICE → TAX → GRAND TOTAL
                const serviceCharge = subtotal * outlet.o_sc;
                const tax = (subtotal + serviceCharge) * outlet.o_tax;
                const grandTotal = subtotal + serviceCharge + tax;

                // BUILD ORDER ITEM JSON
                const orderItemPayload = {
                  items: detailedItems,
                  summary: {
                    subtotal: formatGrandTotal(subtotal),
                    service_charge: formatGrandTotal(serviceCharge),
                    tax: formatGrandTotal(tax),
                    grand_total: formatGrandTotal(grandTotal),
                  },
                };

                // CREATE ORDER
                return orderController.createOrder({
                  or_o_id: body.outlet_id,
                  or_table_no: body.table_no,
                  or_u_id: body.user_id,

                  or_tax: outlet.o_tax,
                  or_sc: outlet.o_sc,
                  or_subtotal: Math.ceil(subtotal),
                  or_grand_total: Math.ceil(grandTotal),

                  or_order_item: JSON.stringify(orderItemPayload),
                });
              });

              return {
                success: true,
                message: "Order created successfully",
                data: result,
              };
            } catch (error: any) {
              console.error("Create order error:", error);

              set.status = 400;
              return {
                success: false,
                message: error.message ?? "Order creation failed",
              };
            }
          })
      )

      // UPDATE ORDER (Admin only)
      .guard(
        {
          params: t.Object({ id: t.Numeric() }),
          body: t.Object({
            table_no: t.Optional(t.String()),
            tax: t.Optional(t.Numeric()),
            sc: t.Optional(t.Numeric()),
            subtotal: t.Optional(t.Numeric()),
            grand_total: t.Optional(t.Numeric()),
            order_item: t.Optional(t.String()),
          }),
        },
        (guardApp: any) =>
          guardApp.put("/:id", async ({ headers, params, body, set }: any) => {
            const auth = verifyAuth(headers);

            if (!auth.valid) {
              set.status = 403;
              return { success: false, message: auth.error };
            }

            if (!hasPermission(auth.user!.type, [UserType.admin])) {
              set.status = 403;
              return { success: false, message: "Insufficient permissions" };
            }

            const updateData: Record<string, unknown> = {};

            if (body.table_no !== undefined)
              updateData.or_table_no = body.table_no;
            if (body.tax !== undefined) updateData.or_tax = body.tax;
            if (body.sc !== undefined) updateData.or_sc = body.sc;
            if (body.subtotal !== undefined)
              updateData.or_subtotal = body.subtotal;
            if (body.grand_total !== undefined)
              updateData.or_grand_total = body.grand_total;
            if (body.order_item !== undefined)
              updateData.or_order_item = body.order_item;

            try {
              const updated = await orderController.updateOrder(
                params.id,
                updateData
              );

              return {
                success: true,
                message: "Order updated successfully",
                data: updated,
              };
            } catch (error) {
              console.error("Update order error:", error);
              set.status = 500;
              return { success: false, message: "Something went wrong" };
            }
          })
      )
  );
}
