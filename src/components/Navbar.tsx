import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const Navbar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Strata Reserve Planning (SRP)</div>
      
      {/* Hamburger Menu Button */}
      <button 
        className={`navbar-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`navbar-links ${isMobileMenuOpen ? 'active' : ''}`}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} 
          onClick={closeMobileMenu}
          end
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/upload" 
          className={({ isActive }) => `nav-link upload-btn ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Upload Document
        </NavLink>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Profile
        </NavLink>
        <button 
          onClick={() => {
            handleLogout();
            closeMobileMenu();
          }} 
          className="nav-link logout-btn"
        >
          <img src="/icons/logout-icon.svg" alt="" />Sign Out
        </button>
      </div>
    </nav>
  );
};
