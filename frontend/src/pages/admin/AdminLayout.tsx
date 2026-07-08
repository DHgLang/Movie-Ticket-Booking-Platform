import { NavLink, Outlet, Link } from "react-router-dom";

const nav = [
  { to: "/admin", end: true, label: "Báo cáo & Thống kê" },
  { to: "/admin/traffic", label: "Traffic (RUM + API)" },
  { to: "/admin/movies", label: "Quản lý phim" },
  { to: "/admin/showtimes", label: "Suất chiếu" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/cinemas", label: "Rạp chiếu" },
  { to: "/admin/settings", label: "Cài đặt" },
];

export default function AdminLayout() {
  return (
    <div className="gv-admin-shell">
      <aside className="gv-admin-sidebar">
        <div className="gv-admin-brand">
          <Link to="/">Spirit Movie</Link>
          <span>Admin Panel</span>
        </div>
        <nav className="gv-admin-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="gv-admin-back">
          ← Về trang khách
        </Link>
      </aside>
      <div className="gv-admin-main">
        <Outlet />
      </div>
    </div>
  );
}
