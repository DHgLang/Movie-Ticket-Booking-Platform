import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Movie: a
    .model({
      title: a.string().required(),
      description: a.string(),
      durationMin: a.integer().required(),
      posterUrl: a.string(),
      rating: a.string(),
      showtimes: a.hasMany("Showtime", "movieId"),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  Cinema: a
    .model({
      name: a.string().required(),
      address: a.string(),
      screens: a.hasMany("Screen", "cinemaId"),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  Screen: a
    .model({
      name: a.string().required(),
      rows: a.integer().required(),
      cols: a.integer().required(),
      cinemaId: a.id().required(),
      cinema: a.belongsTo("Cinema", "cinemaId"),
      showtimes: a.hasMany("Showtime", "screenId"),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  Showtime: a
    .model({
      movieId: a.id().required(),
      screenId: a.id().required(),
      startsAt: a.datetime().required(),
      price: a.float().required(),
      movie: a.belongsTo("Movie", "movieId"),
      screen: a.belongsTo("Screen", "screenId"),
      bookings: a.hasMany("Booking", "showtimeId"),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  Booking: a
    .model({
      showtimeId: a.id().required(),
      userId: a.string().required(),
      seats: a.string().required(),
      status: a.enum(["PENDING", "PAID", "CONFIRMED", "CANCELLED"]),
      totalAmount: a.float().required(),
      showtime: a.belongsTo("Showtime", "showtimeId"),
      ticket: a.hasOne("Ticket", "bookingId"),
    })
    .authorization((allow) => [allow.owner(), allow.group("admin")]),

  Ticket: a
    .model({
      bookingId: a.id().required(),
      qrCode: a.string().required(),
      booking: a.belongsTo("Booking", "bookingId"),
    })
    .authorization((allow) => [allow.owner(), allow.group("admin")]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
