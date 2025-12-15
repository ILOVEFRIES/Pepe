export default function parseOrderItem<T extends { or_order_item?: unknown }>(
  order: T
): T & { or_order_item?: any } {
  if (!order.or_order_item || typeof order.or_order_item !== "string") {
    return order;
  }

  try {
    return {
      ...order,
      or_order_item: JSON.parse(order.or_order_item),
    };
  } catch {
    return {
      ...order,
      or_order_item: null,
    };
  }
}
