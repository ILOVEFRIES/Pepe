import { Elysia } from "elysia";
import { bucket } from "../util/firebase";

export const firebaseMiddleware = new Elysia({ name: "firebase" }).decorate(
  "firebase",
  {
    bucket,
  }
);
