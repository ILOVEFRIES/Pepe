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
          params: t.Object({
            outletId: t.Numeric(),
          }),
        },
        (guardApp: any) =>
          guardApp.get(
            "/outlet/:outletId",
            async ({ headers, params, set }: any) => {
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
                const data = await orderController.getOrdersByOutletId(
                  params.outletId
                );

                return { success: true, data };
              } catch (error) {
                console.error("Get orders by outlet error:", error);
                set.status = 500;
                return { success: false, message: "Something went wrong" };
              }
            }
          )
      )

      // CREATE ORDER (Admin & Customer)
      .guard(
        {
          body: t.Object({
            uid: t.String(),
            outlet_id: t.Numeric(),
            table_no: t.String(),
            user_id: t.Numeric(),
            order_item: t.Array(
              t.Object({
                menu_id: t.Numeric(),
                quantity: t.Numeric(),
                additionals: t.Optional(
                  t.Array(
                    t.Object({
                      additional_id: t.Numeric(),
                      quantity: t.Numeric(),
                    })
                  )
                ),
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
              // GET OUTLET (for tax & service charge)
              const outlet = await db.outlet.findUnique({
                where: { o_id: body.outlet_id },
                select: {
                  o_tax: true,
                  o_sc: true,
                },
              });

              if (!outlet) {
                set.status = 404;
                return { success: false, message: "Outlet not found" };
              }

              // CALCULATE SUBTOTAL
              let subtotal = 0;

              const detailedItems = [];

              for (const item of body.order_item) {
                const outletMenu = await db.outlet_menu.findFirst({
                  where: {
                    om_m_id: item.menu_id,
                    om_o_id: body.outlet_id,
                    om_is_deleted: false,
                  },
                  select: {
                    om_price: true,
                  },
                });

                if (!outletMenu) {
                  set.status = 400;
                  return {
                    success: false,
                    message: `Menu ${item.menu_id} not available in outlet`,
                  };
                }

                const itemTotal = outletMenu.om_price * item.quantity;
                subtotal += itemTotal;

                detailedItems.push({
                  menu_id: item.menu_id,
                  quantity: item.quantity,
                  price: outletMenu.om_price,
                  total: itemTotal,
                  additionals: item.additionals ?? [],
                });
              }

              // SERVICE CHARGE (FROM SUBTOTAL)
              const serviceCharge = subtotal * outlet.o_sc;

              // TAX (FROM SUBTOTAL + SERVICE)
              const taxableAmount = subtotal + serviceCharge;
              const taxAmount = taxableAmount * outlet.o_tax;

              // GRAND TOTAL
              const grandTotal = taxableAmount + taxAmount;

              // BUILD ORDER ITEM (FORMATTED)
              const orderItemPayload = {
                items: detailedItems,
                summary: {
                  subtotal: formatGrandTotal(subtotal),
                  service_charge: formatGrandTotal(serviceCharge),
                  tax: formatGrandTotal(taxAmount),
                  grand_total: formatGrandTotal(grandTotal),
                },
              };

              // CREATE ORDER (CONTROLLER)
              const created = await orderController.createOrder({
                or_uid: body.uid,
                or_o_id: body.outlet_id,
                or_table_no: body.table_no,
                or_u_id: body.user_id,

                // numeric (for reports)
                or_tax: outlet.o_tax,
                or_sc: outlet.o_sc,
                or_subtotal: Math.ceil(subtotal),
                or_grand_total: Math.ceil(grandTotal),

                // formatted + detail
                or_order_item: JSON.stringify(orderItemPayload),
              });

              return {
                success: true,
                message: "Order created successfully",
                data: created,
              };
            } catch (error) {
              console.error("Create order error:", error);
              set.status = 500;
              return { success: false, message: "Internal server error" };
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
