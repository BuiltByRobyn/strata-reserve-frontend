// Admin Profile Page - Display and edit admin profile information
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import type { AdminUser } from '../../shared/types/auth.types';
import type { AdminProfileFormData as ProfileData } from '../../shared/types/entities.types';
import { API_BASE } from '../../shared/lib/api';
import { formatPhoneNumber, validatePhoneNumber } from '../../shared/utils/strataUtils';
import { InspectorAvailabilityManager } from '../components/InspectorAvailabilityManager';
import { CompanyHolidaysManager } from '../components/CompanyHolidaysManager';
import { MobileDropdown } from '../../shared/components/MobileDropdown';
import { ChangePasswordModal } from '../../shared/components/ChangePasswordModal';
import '../../admin/styles/pages/_profile.scss';

export default function ProfilePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const location = useLocation();

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    companyName: 'Strata Reserve Planning',
    contactName: '',
    phoneNumber: '',
    role: 'Administrator',
    email: 'admin@admin.com'
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('system-settings-tab') || location.state?.tab || 'holidays');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 750px)');

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch(`${API_BASE}/admin/profile`);

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      if (data.success) {
        const profile = data.data;
        const userName = user && user.role === 'admin' ? (user as AdminUser).fullName : '';
        setProfileData(prev => ({
          ...prev,
          contactName: profile.fullName || userName || '',
          email: profile.email || user?.email || ''
        }));
      } else {
        throw new Error(data.error || 'Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Use auth context data as fallback
      const userName = user && user.role === 'admin' ? (user as AdminUser).fullName : '';
      setProfileData(prev => ({
        ...prev,
        contactName: userName || '',
        email: user?.email || ''
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ProfileData, value: string) => {
    const formatted = field === 'phoneNumber' ? formatPhoneNumber(value) : value;
    setProfileData(prev => ({ ...prev, [field]: formatted }));
    if (field === 'phoneNumber') {
      setPhoneError(formatted && !validatePhoneNumber(formatted) ? 'Please enter a valid phone number (e.g. 604 123 4567)' : null);
    }
    setSuccessMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await authFetch(`${API_BASE}/admin/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: profileData.contactName,
          companyName: profileData.companyName,
          phoneNumber: profileData.phoneNumber
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Profile updated successfully!');
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Profile Field Component - editable fields render as inputs, read-only as plain text
  const ProfileField = ({
    label,
    field,
    value,
    placeholder = '',
    readOnly = false,
    error,
    type = 'text'
  }: {
    label: string;
    field: keyof ProfileData;
    value: string;
    placeholder?: string;
    readOnly?: boolean;
    error?: string | null;
    type?: string;
  }) => (
    <div className={`profile-field${readOnly ? ' read-only' : ''}${error ? ' has-error' : ''}`}>
      <div className="field-label">{label}</div>
      {readOnly ? (
        <div className="field-value">{value}</div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="field-input"
        />
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="page-container profile-container">
        <div className="profile-loading">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container profile-container">
      {/* Page Header */}
      <div className="profile-page-header">
        <h1>{!isDesktop ? 'System Settings'
          : activeTab === 'holidays' ? 'Company Holidays'
          : activeTab === 'availability' ? 'Inspector Availability'
          : 'Administration User Details'}</h1>
        <p className="profile-subtitle">
          {activeTab === 'holidays' ? 'Manage company holiday schedules'
          : activeTab === 'availability' ? 'Manage inspector availability schedules'
          : 'Please verify and update your user information'}
        </p>
      </div>

      {/* Tabs - desktop tabs, mobile dropdown */}
      {isDesktop ? (
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => { setActiveTab('holidays'); sessionStorage.setItem('system-settings-tab', 'holidays'); }}
          >
            Company Holidays
          </button>
          <button
            className={`tab ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => { setActiveTab('availability'); sessionStorage.setItem('system-settings-tab', 'availability'); }}
          >
            Inspector Availability
          </button>
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); sessionStorage.setItem('system-settings-tab', 'profile'); }}
          >
            Profile
          </button>
        </div>
      ) : (
        <MobileDropdown
          label="Categories"
          value={activeTab}
          options={[
            { key: 'holidays', label: 'Company Holidays' },
            { key: 'availability', label: 'Inspector Availability' },
            { key: 'profile', label: 'Profile' },
          ]}
          onChange={(tab) => { setActiveTab(tab); sessionStorage.setItem('system-settings-tab', tab); }}
        />
      )}

      {/* Company Holidays */}
      {activeTab === 'holidays' && (
        <div className="profile-content">
          <section className="profile-section">
            <CompanyHolidaysManager />
          </section>
        </div>
      )}

      {/* Inspector Availability */}
      {activeTab === 'availability' && (
        <div className="profile-content">
          <section className="profile-section">
            <InspectorAvailabilityManager />
          </section>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="profile-content">
          {isDesktop && (
            <div className="manager-header company-holidays-header" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-confirm company-holidays-add-btn"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Confirm Profile'}
              </button>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success">
              {successMessage}
            </div>
          )}

          <section className="profile-section">
            <h2>Administrator Profile</h2>

            <div className="profile-grid three-columns">
              <ProfileField
                label="Company Name"
                field="companyName"
                value={profileData.companyName}
                placeholder="Enter company name"
              />
              <ProfileField
                label="Contact Name"
                field="contactName"
                value={profileData.contactName}
                placeholder="Enter contact name"
              />
              <ProfileField
                label="Role"
                field="role"
                value={profileData.role}
                readOnly
              />
            </div>

            <div className="profile-grid one-column">
              <ProfileField
                label="Phone Number"
                field="phoneNumber"
                value={profileData.phoneNumber}
                placeholder="604 123 4567"
                type="tel"
                error={phoneError}
              />
            </div>
          </section>

          <section className="profile-section">
            <h2>Login Details</h2>

            <div className="login-details-row">
              <ProfileField
                label="Email"
                field="email"
                value={profileData.email}
                readOnly
              />
              <button
                type="button"
                className="change-password-link"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Change Password
              </button>
            </div>
          </section>

          <ChangePasswordModal 
            isOpen={isPasswordModalOpen} 
            onClose={() => setIsPasswordModalOpen(false)} 
          />

          {!isDesktop && (
            <div className="profile-actions">
              <button
                type="button"
                className="btn-confirm"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoadingSpinner />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Confirm Profile'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="profile-footer">
        <p>© 2026 Strata Reserve Planning. All rights reserved.</p>
      </footer>
    </div>
  );
}
