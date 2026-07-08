import type { Cinema, Movie, Screen, Showtime } from "../../../shared/types";

export const seedCinemas: Cinema[] = [
  { id: "c1", name: "Vincom Dong Khoi", address: "Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Quận 1", city: "Ho Chi Minh City" },
  { id: "c2", name: "Pearl Plaza", address: "Pearl Plaza, 561A Điện Biên Phủ, Bình Thạnh", city: "Ho Chi Minh City" },
  { id: "c3", name: "Binh Duong", address: "AEON Mall Bình Dương Canary, Thuận Giao, Thuận An", city: "Binh Duong" },
  { id: "c4", name: "Vincom Thao Dien", address: "Vincom Mega Mall, 161 Xa lộ Hà Nội, Thảo Điền", city: "Ho Chi Minh City" },
];

export const seedScreens: Screen[] = [
  { id: "sc1", cinemaId: "c1", name: "Screen 1 - IMAX", rows: 8, cols: 12 },
  { id: "sc2", cinemaId: "c1", name: "Screen 2", rows: 6, cols: 10 },
  { id: "sc3", cinemaId: "c2", name: "Screen A - ScreenX", rows: 7, cols: 9 },
  { id: "sc4", cinemaId: "c3", name: "Screen 1 - Super Plex", rows: 8, cols: 10 },
  { id: "sc5", cinemaId: "c4", name: "Screen 1 - Gold Class", rows: 6, cols: 8 },
];

export const seedMovies: Movie[] = [
  {
    id: "m1",
    title: "Dune: Part Three",
    description: "Paul Atreides faces the ultimate war across the galaxy.",
    durationMin: 155,
    rating: "PG-13",
    genre: "Sci-Fi",
    status: "NOW_SHOWING",
    distributorSharePct: 50,
  },
  {
    id: "m2",
    title: "Inside Out 3",
    description: "New emotions arrive as Riley enters college.",
    durationMin: 98,
    rating: "G",
    genre: "Animation",
    status: "NOW_SHOWING",
    distributorSharePct: 45,
  },
  {
    id: "m3",
    title: "Mission Impossible 9",
    description: "Ethan Hunt's most dangerous mission yet.",
    durationMin: 142,
    rating: "PG-13",
    genre: "Action",
    status: "SPECIAL",
    distributorSharePct: 55,
  },
  {
    id: "m4",
    title: "The Batman: New Order",
    description: "Gotham under siege from a new criminal syndicate.",
    durationMin: 128,
    rating: "PG-13",
    genre: "Action",
    status: "COMING_SOON",
    releaseDate: "2026-08-01",
    distributorSharePct: 50,
  },
];

export const seedShowtimes: Showtime[] = [
  { id: "s1", movieId: "m1", screenId: "sc1", startsAt: "2026-07-10T19:00:00", price: 12.5 },
  { id: "s2", movieId: "m2", screenId: "sc2", startsAt: "2026-07-10T21:30:00", price: 10 },
  { id: "s3", movieId: "m3", screenId: "sc1", startsAt: "2026-07-11T20:00:00", price: 14, isSpecial: true },
  { id: "s4", movieId: "m4", screenId: "sc3", startsAt: "2026-07-11T22:15:00", price: 11.5 },
  { id: "s5", movieId: "m1", screenId: "sc3", startsAt: "2026-07-12T18:30:00", price: 13 },
];
