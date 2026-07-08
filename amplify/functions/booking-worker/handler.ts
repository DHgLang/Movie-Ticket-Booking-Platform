import type { SQSHandler } from "aws-lambda";
import { confirmBooking } from "../_shared/store";

/** SQS worker — confirm booking + log for demo (email/SNS in phase 2) */
export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as {
      bookingId: string;
      ticketId?: string;
      userId?: string;
      showtimeId?: string;
      seats?: string[];
      totalAmount?: number;
    };

    console.log("Processing booking:", payload);

    const booking = await confirmBooking(payload.bookingId);
    if (booking) {
      console.log("Booking confirmed:", booking.id, "seats:", booking.seats.join(", "));
    } else {
      console.warn("Booking not found:", payload.bookingId);
    }
  }
};
