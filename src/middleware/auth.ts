import jwt from "jsonwebtoken";
import { UserType } from "@prisma/client";

// VERIFY AUTH TOKEN
export const verifyAuth = (headers: Record<string, string | undefined>) => {
  if (!headers.authorization) {
    return { valid: false, error: "Authorization token required" };
  }

  try {
    const token = headers.authorization.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      type: UserType;
      iat: number;
      exp: number;
    };

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, user: decoded };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
};

// PERMISSION CHECKER
export const hasPermission = (userType: UserType, allowed: UserType[]) => {
  return allowed.includes(userType);
};
