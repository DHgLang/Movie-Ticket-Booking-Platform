import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import type { Booking } from "../../../../shared/types";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    adminApi.bookings().then((r) => setBookings(r.items));
  }, []);

  const filtered = status ? bookings.filter((b) => b.status === status) : bookings;

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Bookings</h1>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </header>

      <section className="gv-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Showtime</th>
              <th>Ghế</th>
              <th>Tổng</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((b) => (
                <tr key={b.id}>
                  <td>{b.id.slice(0, 8)}…</td>
                  <td>{b.showtimeId}</td>
                  <td>{b.seats.join(", ")}</td>
                  <td>USD {b.totalAmount.toFixed(2)}</td>
                  <td>{b.status}</td>
                  <td>{new Date(b.createdAt).toLocaleString("en-SG")}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p>Chưa có booking.</p>}
      </section>
    </div>
  );
}
