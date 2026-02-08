import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/contexts/AuthContext";

export const ClientNavbar = () => {
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

  // Get client user details
  const clientUser = user?.role === 'client' ? user : null;

  return (
    <nav className="navbar client-navbar">
      <div className="navbar-brand">
        <img src="/logo.svg" alt="Building Icon" />
        <div className="navbar-brand-titles">
          <span>Strata Reserve</span>
          <div className="navbar-brand-text">Planning Portal</div>
        <div className="navbar-user-info">
          User: {clientUser?.firstName} {clientUser?.lastName}
        </div>
        </div>
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
          to="/client/dashboard" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} 
          onClick={closeMobileMenu}
          end
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/client/reports" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          My Reports
        </NavLink>
        <NavLink 
          to="/client/profile" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          {clientUser?.firstName ? `${clientUser.firstName} ${clientUser.lastName}` : 'Profile'}
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
