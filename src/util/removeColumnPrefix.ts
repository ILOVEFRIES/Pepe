/// This function removes the column prefix in database query results
///
/// For example, given this object
/// {
///   a_id: "123",
///   a_name: "name"
/// }
/// the function will transform it into this object
/// {
///   id: "123",
///   name: "name"
/// }

// Excluded fields
const excludeFields = [
  "item_total_price",
  "with_charges",
  "without_charges",
  "is_revoked",
];

const removeColumnPrefix = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    // If the input is an array, recursively process each element
    return obj.map((item) => removeColumnPrefix(item));
  } else if (
    typeof obj === "object" &&
    obj !== null &&
    !(obj instanceof Date)
  ) {
    // If the input is an object and not a Date, process each key-value pair
    const newObj: Record<string, unknown> = {};

    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const underscoreIndex = key.indexOf("_");
        const newKey = excludeFields.includes(key)
          ? key
          : underscoreIndex !== -1
          ? key.slice(underscoreIndex + 1)
          : key;

        const value = (obj as Record<string, unknown>)[key];
        newObj[newKey] = removeColumnPrefix(value);
      }
    }

    return newObj;
  } else {
    // If the input is neither an array nor an object, or if it's a Date, return it as is
    return obj;
  }
};

export default removeColumnPrefix;
