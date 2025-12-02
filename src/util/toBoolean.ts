export default function toBoolean(boo: unknown): boolean {
  if (boo === null || boo === undefined) return false;

  if (typeof boo === "boolean") return boo;

  if (typeof boo === "number") {
    if (boo === 1) return true;
    if (boo === 0 || boo === 2) return false;
    throw new Error("Invalid boolean value");
  }

  if (typeof boo === "string") {
    const lower = boo.toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
    throw new Error("Invalid boolean value");
  }

  throw new Error("Invalid boolean value");
}
