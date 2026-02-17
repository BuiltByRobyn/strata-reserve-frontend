// Admin Profile Page - Display and edit admin profile information
import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { supabase } from '../../shared/lib/supabaseClient';
import type { AdminUser } from '../../shared/types/auth.types';
import type { AdminProfileFormData as ProfileData } from '../../shared/types/entities.types';
import { API_BASE } from '../../shared/lib/api';
import '../../admin/styles/pages/_profile.scss';

export default function ProfilePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  
  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    companyName: 'Strata Reserve Planning',
    contactName: '',
    role: 'Administrator',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    email: 'admin@admin.com'
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const isDesktop = useMediaQuery('(min-width: 600px)');

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
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
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
          address: profileData.address,
          city: profileData.city,
          province: profileData.province,
          postalCode: profileData.postalCode
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
    readOnly = false
  }: {
    label: string;
    field: keyof ProfileData;
    value: string;
    placeholder?: string;
    readOnly?: boolean;
  }) => (
    <div className={`profile-field${readOnly ? ' read-only' : ''}`}>
      <div className="field-label">{label}</div>
      {readOnly ? (
        <div className="field-value">{value}</div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="field-input"
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="page-container profile-container">
        <div className="profile-loading">
          <LoadingSpinner />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container profile-container">
      {/* Page Header */}
      <div className="profile-page-header">
        <h1>Administration User Details</h1>
        <p className="profile-subtitle">Please verify and update your user information</p>
      </div>

      {/* Tabs - desktop only */}
      {isDesktop && (
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => setActiveTab('holidays')}
          >
            Company Holidays
          </button>
          <button
            className={`tab ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Inspector Availability
          </button>
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>
      )}

      {/* Company Holidays */}
      {(!isDesktop || activeTab === 'holidays') && (
        <div className="profile-content">
          <section className="profile-section">
            <h2>Company Holidays</h2>
            <p className="placeholder-text">Company holidays management coming soon...</p>
          </section>
        </div>
      )}

      {/* Inspector Availability */}
      {(!isDesktop || activeTab === 'availability') && (
        <div className="profile-content">
          <section className="profile-section">
            <h2>Inspector Availability</h2>
            <p className="placeholder-text">Inspector availability management coming soon...</p>
          </section>
        </div>
      )}

      {/* Profile */}
      {(!isDesktop || activeTab === 'profile') && (
        <div className="profile-content">
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
                label="Address"
                field="address"
                value={profileData.address}
                placeholder="Enter address"
              />
            </div>

            <div className="profile-grid three-columns">
              <ProfileField
                label="City"
                field="city"
                value={profileData.city}
                placeholder="Enter city"
              />
              <ProfileField
                label="Province"
                field="province"
                value={profileData.province}
                placeholder="Enter province"
              />
              <ProfileField
                label="Postal Code"
                field="postalCode"
                value={profileData.postalCode}
                placeholder="Enter postal code"
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
                onClick={async () => {
                  try {
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profileData.email);
                    if (resetError) throw resetError;
                    setSuccessMessage('Password reset email sent. Please check your inbox.');
                  } catch (err) {
                    console.error('Password reset error:', err);
                    setError('Failed to send password reset email. Please try again.');
                  }
                }}
              >
                Change Password
              </button>
            </div>
          </section>

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
        </div>
      )}

      {/* Footer */}
      <footer className="profile-footer">
        <p>© 2026 Strata Reserve Planning. All rights reserved.</p>
      </footer>
    </div>
  );
}
