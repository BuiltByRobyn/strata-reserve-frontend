// Client Profile Page - Display and edit client profile information
import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import type { ClientUser } from '../../shared/types/auth.types';
import type { ClientProfileFormData as ProfileData } from '../../shared/types/entities.types';
import { API_BASE } from '../../shared/lib/api';
import '../../client/styles/pages/_profile.scss';

export function Profile() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  
  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: 'client@client.com',
    cellNumber: '',
    officeNumber: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    role: 'Property Manager'
  });
  
  // Edit form state (for modal)
  const [editFormData, setEditFormData] = useState<ProfileData>(profileData);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`${API_BASE}/client/profile`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const profile = data.data;
        const clientUser = user && user.role === 'client' ? user as ClientUser : null;
        const newData = {
          companyName: profile.companyName || 'Sample Strata Corporation',
          firstName: profile.firstName || clientUser?.firstName || '',
          lastName: profile.lastName || clientUser?.lastName || '',
          email: profile.email || clientUser?.email || 'client@client.com',
          cellNumber: profile.cellNumber || '',
          officeNumber: profile.officeNumber || '',
          address: profile.address || '',
          city: profile.city || '',
          province: profile.province || '',
          postalCode: profile.postalCode || '',
          role: 'Property Manager'
        };
        setProfileData(newData);
        setEditFormData(newData);
      } else {
        throw new Error(data.error || 'Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Use auth context data as fallback
      const clientUser = user && user.role === 'client' ? user as ClientUser : null;
      const fallbackData = {
        companyName: 'Sample Strata Corporation',
        firstName: clientUser?.firstName || 'John',
        lastName: clientUser?.lastName || 'Doe',
        email: clientUser?.email || 'client@client.com',
        cellNumber: '',
        officeNumber: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
        role: 'Property Manager'
      };
      setProfileData(fallbackData);
      setEditFormData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditFormData(profileData);
    setError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setError(null);
  };

  const handleEditFormChange = (field: keyof ProfileData, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await authFetch(`${API_BASE}/client/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: editFormData.companyName,
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          email: editFormData.email,
          cellNumber: editFormData.cellNumber,
          officeNumber: editFormData.officeNumber,
          address: editFormData.address,
          city: editFormData.city,
          province: editFormData.province,
          postalCode: editFormData.postalCode,
          role: editFormData.role
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProfileData(editFormData);
        setSuccessMessage('Profile updated successfully!');
        setIsEditModalOpen(false);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
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

  const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

  return (
    <div className="page-container profile-container">
      {/* Page Header */}
      <div className="profile-page-header">
        <h1>Strata Members</h1>
        <p className="profile-subtitle">The following members are associated with your strata</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Your Personal Details Card */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Your Personal Details</h2>
          <span className="role-badge">{profileData.role}</span>
        </div>
        
        <div className="profile-details-grid">
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">{fullName || 'Not set'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{profileData.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Cell</span>
            <span className="detail-value">{profileData.cellNumber || 'Not set'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Office</span>
            <span className="detail-value">{profileData.officeNumber || 'Not set'}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-update-details"
          onClick={handleOpenEditModal}
        >
          Update Your Details
        </button>
      </div>

      {/* Alternative Site Contact Cards */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Alternative Site Contact</h2>
          <span className="role-badge secondary">Councillor</span>
        </div>
        
        <div className="profile-details-grid">
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">Jerry Springer</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">jerry@associa.com</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Cell</span>
            <span className="detail-value">604 987 6543</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Office</span>
            <span className="detail-value">604 987 6543</span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Alternative Site Contact</h2>
          <span className="role-badge secondary">Councillor</span>
        </div>
        
        <div className="profile-details-grid">
          <div className="detail-item">
            <span className="detail-label">Name</span>
            <span className="detail-value">Oprah Winfrey</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">opera@associa.com</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Cell</span>
            <span className="detail-value">778 123 7891</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Office</span>
            <span className="detail-value">778 123 7891</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="profile-footer">
        <p>© 2026 Strata Reserve Planning. All rights reserved.</p>
      </footer>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Update Personal Details"
        size="large"
        footer={
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseEditModal}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoadingSpinner />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        }
      >
        <div className="edit-profile-form">
          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <FormRow>
            <InputField
              label="First Name"
              name="firstName"
              type="text"
              value={editFormData.firstName}
              onChange={(e) => handleEditFormChange('firstName', e.target.value)}
              required
            />
            <InputField
              label="Last Name"
              name="lastName"
              type="text"
              value={editFormData.lastName}
              onChange={(e) => handleEditFormChange('lastName', e.target.value)}
              required
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Email"
              name="email"
              type="email"
              value={editFormData.email}
              onChange={(e) => handleEditFormChange('email', e.target.value)}
              required
            />
            <InputField
              label="Cell Number"
              name="cellNumber"
              type="tel"
              value={editFormData.cellNumber}
              onChange={(e) => handleEditFormChange('cellNumber', e.target.value)}
              placeholder="604 123 4567"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Office Number"
              name="officeNumber"
              type="tel"
              value={editFormData.officeNumber}
              onChange={(e) => handleEditFormChange('officeNumber', e.target.value)}
              placeholder="604 123 4567"
            />
            <div className="form-field">
              <label>Role</label>
              <div className="role-options">
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="Property Manager"
                    checked={editFormData.role === 'Property Manager'}
                    onChange={(e) => handleEditFormChange('role', e.target.value)}
                  />
                  <span>Property Manager</span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="Councillor"
                    checked={editFormData.role === 'Councillor'}
                    onChange={(e) => handleEditFormChange('role', e.target.value)}
                  />
                  <span>Councillor</span>
                </label>
              </div>
            </div>
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}
