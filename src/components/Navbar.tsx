import { NavLink } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Strata Reserve Planning (SRP)</div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          Dashboard
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => `nav-link upload-btn ${isActive ? 'active' : ''}`}>
          Upload Document
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Profile
        </NavLink>
      </div>
    </nav>
  );
};
