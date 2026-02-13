// Admin Profile Page - Display and edit admin profile information
import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import type { AdminUser } from '../../shared/types/auth.types';
import '../../admin/styles/pages/_profile.scss';

const API_URL = 'http://localhost:3000';

interface ProfileData {
  companyName: string;
  contactName: string;
  role: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
}

interface EditableField {
  [key: string]: boolean;
}

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
  const [editableFields, setEditableFields] = useState<EditableField>({});

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`${API_URL}/admin/profile`);
      
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

  const toggleEdit = (field: string) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await authFetch(`${API_URL}/admin/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: profileData.contactName,
          email: profileData.email,
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
        // Clear all edit modes
        setEditableFields({});
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

  // Profile Field Component - displays read-only value with edit icon
  const ProfileField = ({ 
    label, 
    field, 
    value, 
    placeholder = '' 
  }: { 
    label: string; 
    field: keyof ProfileData; 
    value: string; 
    placeholder?: string;
  }) => {
    const isEditing = editableFields[field];
    
    return (
      <div className="profile-field">
        <div className="field-label">
          {label}
          <button 
            type="button" 
            className="edit-icon"
            onClick={() => toggleEdit(field)}
            title={isEditing ? 'Save' : 'Edit'}
          >
            {isEditing ? '✓' : '✎'}
          </button>
        </div>
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={placeholder}
            className="field-input"
            autoFocus
          />
        ) : (
          <div className="field-value">{value || placeholder}</div>
        )}
      </div>
    );
  };

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

      {/* Tabs */}
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

      {activeTab === 'profile' && (
        <div className="profile-content">
          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success">
              {successMessage}
            </div>
          )}

          {/* Basic Information Section */}
          <section className="profile-section">
            <h2>Basic Information</h2>
            
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

          {/* Login Details Section */}
          <section className="profile-section">
            <h2>Login Details</h2>
            
            <div className="login-details-row">
              <ProfileField 
                label="Email" 
                field="email" 
                value={profileData.email}
                placeholder="Enter email"
              />
              <button 
                type="button"
                className="change-password-link"
                onClick={() => alert('Password change feature coming soon!')}
              >
                Change Password
              </button>
            </div>
          </section>

          {/* Confirm Button */}
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

      {activeTab === 'holidays' && (
        <div className="profile-content">
          <section className="profile-section">
            <h2>Company Holidays</h2>
            <p className="placeholder-text">Company holidays management coming soon...</p>
          </section>
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="profile-content">
          <section className="profile-section">
            <h2>Inspector Availability</h2>
            <p className="placeholder-text">Inspector availability management coming soon...</p>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="profile-footer">
        <p>© 2026 Strata Reserve Planning. All rights reserved.</p>
      </footer>
    </div>
  );
}
