const excludeFields = [
  "item_total_price",
  "with_charges",
  "without_charges",
  "is_revoked",
] as const;

export function removeColumnPrefix(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeColumnPrefix);
  }

  if (typeof obj === "object" && obj !== null && !(obj instanceof Date)) {
    const newObj: Record<string, unknown> = {};

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const underscoreIndex = key.indexOf("_");
      const newKey = excludeFields.includes(key as any)
        ? key
        : underscoreIndex !== -1
        ? key.slice(underscoreIndex + 1)
        : key;

      newObj[newKey] = removeColumnPrefix(
        (obj as Record<string, unknown>)[key]
      );
    }

    return newObj;
  }

  return obj;
}
