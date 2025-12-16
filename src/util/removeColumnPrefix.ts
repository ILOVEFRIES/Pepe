const excludeFields = [
  "menu_subitems",
  "menu",
  "item_total_price",
  "with_charges",
  "without_charges",
  "is_revoked",
] as const;

/**
 * Removes column prefixes (e.g. o_id → id) recursively
 * while preserving object shape.
 */
export function removeColumnPrefix<T>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(removeColumnPrefix);
  }

  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const newMap = new Map<string, unknown>();

    for (const [key, value] of Object.entries(obj)) {
      const underscoreIndex = key.indexOf("_");
      const newKey = (excludeFields as readonly string[]).includes(key)
        ? key
        : underscoreIndex !== -1
        ? key.slice(underscoreIndex + 1)
        : key;

      newMap.set(newKey, removeColumnPrefix(value));
    }

    // Convert back to plain object if needed
    return Object.fromEntries(newMap);
  }

  return obj;
}
