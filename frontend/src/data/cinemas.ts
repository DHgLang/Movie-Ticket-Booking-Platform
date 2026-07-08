export type CinemaLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  phone: string;
  website?: string;
  halls: number;
  tags: string;
};

export const CINEMA_HOTLINE = "1900 1234";

export const cinemaLocations: CinemaLocation[] = [
  {
    id: "c1",
    name: "Vincom Dong Khoi",
    address: "Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Quận 1",
    city: "Ho Chi Minh City",
    rating: 4.3,
    phone: CINEMA_HOTLINE,
    website: "https://www.cgv.vn",
    halls: 8,
    tags: "IMAX · 4DX · Gold Class",
  },
  {
    id: "c2",
    name: "Pearl Plaza",
    address: "Pearl Plaza, 561A Điện Biên Phủ, Bình Thạnh",
    city: "Ho Chi Minh City",
    rating: 4.3,
    phone: CINEMA_HOTLINE,
    website: "https://www.cgv.vn",
    halls: 7,
    tags: "ScreenX · Gold Class",
  },
  {
    id: "c3",
    name: "Binh Duong",
    address: "AEON Mall Bình Dương Canary, Thuận Giao, Thuận An",
    city: "Binh Duong",
    rating: 4.3,
    phone: CINEMA_HOTLINE,
    website: "https://lottecinemavn.com",
    halls: 9,
    tags: "Super Plex · L'Kids",
  },
  {
    id: "c4",
    name: "Vincom Thao Dien",
    address: "Vincom Mega Mall, 161 Xa lộ Hà Nội, Thảo Điền",
    city: "Ho Chi Minh City",
    rating: 4.2,
    phone: CINEMA_HOTLINE,
    website: "https://www.cgv.vn",
    halls: 6,
    tags: "Gold Class · Starium",
  },
];

export function cinemaMapQuery(c: CinemaLocation) {
  return `${c.address}, ${c.city}, Vietnam`;
}

export function getCinemaById(id: string) {
  return cinemaLocations.find((c) => c.id === id);
}
