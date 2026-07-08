import { defineFunction } from "@aws-amplify/backend";

export const bookingApi = defineFunction({
  name: "booking-api",
  entry: "./handler.ts",
  timeoutSeconds: 30,
});
