import { NavLink } from "react-router-dom";
import { gvNav } from "../config/nav";

export default function IconNav() {
  return (
    <nav className="gv-iconnav">
      <div className="gv-container gv-iconnav-inner">
        {gvNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `gv-iconnav-item${isActive ? " active" : ""}`}
          >
            <span className="gv-iconnav-icon">{item.icon}</span>
            <span className="gv-iconnav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
