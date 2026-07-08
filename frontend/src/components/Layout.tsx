import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import IconNav from "./IconNav";
import { isAdminUser, isSignedIn } from "../lib/auth";

export default function Layout() {
  const location = useLocation();
  const [admin, setAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    isSignedIn().then(setSignedIn);
    isAdminUser(true).then(setAdmin);
  }, [location.pathname]);

  return (
    <div className="gv-app">
      <header className="gv-header">
        <div className="gv-container gv-header-inner">
          <Link to="/" className="gv-logo">
            <span className="gv-logo-spirit">Spirit</span>
            <span className="gv-logo-movie">Movie</span>
          </Link>
          <div className="gv-header-right">
            {signedIn ? (
              <Link to="/account" className="gv-header-link">
                My Account
              </Link>
            ) : (
              <>
                <Link to="/login" className="gv-header-link">
                  Log In
                </Link>
                <Link to="/login" className="gv-header-link">
                  Register
                </Link>
              </>
            )}
            {admin && (
              <Link to="/admin" className="gv-cart-btn" title="Admin">
                ⚙
              </Link>
            )}
          </div>
        </div>
      </header>

      <IconNav />

      <main className="gv-main">
        <Outlet />
      </main>

      <footer className="gv-footer">
        <div className="gv-container gv-footer-grid">
          <div>
            <h4>Information</h4>
            <Link to="/">Home</Link>
            <Link to="/cinemas">Cinemas</Link>
            <Link to="/buy-tickets">Buy Tickets</Link>
            <Link to="/promotions">Promotions</Link>
          </div>
          <div>
            <h4>Services</h4>
            <Link to="/gold-class">Gold Class</Link>
            <Link to="/dining">Dining</Link>
            <Link to="/vouchers">Vouchers & Cards</Link>
            <Link to="/group-bookings">Group Bookings</Link>
          </div>
          <div>
            <h4>Project</h4>
            <p>Spirit Movie — AWS Amplify</p>
          </div>
        </div>
        <div className="gv-footer-copy">
          © 2026 Spirit Movie. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
