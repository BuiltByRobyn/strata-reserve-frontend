import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/contexts/AuthContext";

export const AdminNavbar = () => {
  const { signOut, user } = useAuth();
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

  // Get admin user details
  const adminUser = user?.role === 'admin' ? user : null;

  return (
    <nav className="navbar admin-navbar">
      <div className="navbar-brand">
        Strata Reserve Planning (SRP)
      </div>
      
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
          to="/admin/dashboard" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} 
          onClick={closeMobileMenu}
          end
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/admin/strata" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Strata
        </NavLink>
        <NavLink 
          to="/admin/users" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Users
        </NavLink>
        <NavLink
          to="/admin/appointments"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Appointments
        </NavLink>
        <NavLink
          to="/admin/documents"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          Documents
        </NavLink>
        <NavLink
          to="/admin/profile" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          {adminUser?.fullName || 'Profile'}
        </NavLink>
        <button 
          onClick={() => {
            handleLogout();
            closeMobileMenu();
          }} 
          className="nav-link logout-btn"
        >
          <img src="/icons/logout-icon.svg" alt="" />Sign Out        </button>
      </div>
    </nav>
  );
};
