import { useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { NavbarProps } from '../types/component.types';

export function Navbar({ variant, navItems, userInfoRows, loading }: NavbarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);

  return (
    <>
      <div
        className={`sidebar-overlay${isMobileMenuOpen ? ' active' : ''}`}
        onClick={closeMobileMenu}
      />
      <nav className={`navbar ${variant}-navbar${isMobileMenuOpen ? ' sidebar-open' : ''}`}>
        <div className="navbar-brand">
          <img src="/logonobg.svg" alt="Building Icon" />
          <div className="navbar-brand-titles">
            <span>Strata Reserve Planning</span>
            <div className="navbar-brand-text">Data Collection Portal</div>
          </div>
        </div>

        <div className="navbar-user-info">
          {userInfoRows.map(({ label, value }) => (
            <div key={label}>
              <div className="navbar-user-title">{label}</div>
              <div className="navbar-user-details">{value}</div>
            </div>
          ))}
        </div>

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
          {loading ? (
            <div className="navbar-links__loading">
              <div className="navbar-links__spinner" />
            </div>
          ) : (
            <>
              {navItems.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                  end={end}
                >
                  {label}
                </NavLink>
              ))}
              <a
                onClick={() => { handleLogout(); closeMobileMenu(); }}
                className="nav-link logout"
              >
                Sign Out
              </a>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
