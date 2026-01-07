import { NavLink } from "react-router-dom";
import "./Navbar.scss";

export const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Strata Reserve Planning (SRP)</div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          Home
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => `nav-link upload-btn ${isActive ? 'active' : ''}`}>
          Upload Document
        </NavLink>
      </div>
    </nav>
  );
};
