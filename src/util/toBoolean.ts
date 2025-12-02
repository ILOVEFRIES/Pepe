export default function toBoolean(boo: any) {
  if (!boo) {
    return false;
  } else if (typeof boo === "string") {
    const lowerBoo = boo.toLowerCase();
    if (lowerBoo === "true" || boo === "1") {
      return true;
    } else if (lowerBoo === "false" || boo === "0") {
      return false;
    } else {
      throw new Error("Invalid boolean value");
    }
  } else if (typeof boo === "number") {
    if (boo === 1) {
      return true;
    } else if (boo === 0) {
      return false;
    } else if (boo === 2) {
      return false;
    } else {
      throw new Error("Invalid boolean value");
    }
  } else if (typeof boo === "boolean") {
    return boo;
  } else {
    throw new Error("Invalid boolean value");
  }
}
