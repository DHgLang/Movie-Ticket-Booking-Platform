export type Movie = {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  posterUrl?: string;
  rating?: string;
};

export type Showtime = {
  id: string;
  movieId: string;
  movieTitle: string;
  startsAt: string;
  price: number;
  screenName: string;
  rows: number;
  cols: number;
};

export const DEMO_MOVIES: Movie[] = [
  {
    id: "m1",
    title: "Dune: Part Three",
    description: "Epic sci-fi continuation.",
    durationMin: 155,
    rating: "PG-13",
  },
  {
    id: "m2",
    title: "Inside Out 3",
    description: "Animated family adventure.",
    durationMin: 98,
    rating: "G",
  },
];

export const DEMO_SHOWTIMES: Showtime[] = [
  {
    id: "s1",
    movieId: "m1",
    movieTitle: "Dune: Part Three",
    startsAt: "2026-07-10T19:00:00",
    price: 12.5,
    screenName: "Screen 1",
    rows: 8,
    cols: 10,
  },
  {
    id: "s2",
    movieId: "m2",
    movieTitle: "Inside Out 3",
    startsAt: "2026-07-10T21:30:00",
    price: 10,
    screenName: "Screen 2",
    rows: 6,
    cols: 8,
  },
];
