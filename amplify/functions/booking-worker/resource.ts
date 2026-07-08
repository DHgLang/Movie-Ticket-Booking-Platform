import { defineFunction } from "@aws-amplify/backend";

export const bookingWorker = defineFunction({
  name: "booking-worker",
  entry: "./handler.ts",
  timeoutSeconds: 60,
});
