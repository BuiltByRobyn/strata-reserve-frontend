import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import type { StrataMemberInfo, StrataProfileResult, PropertyType } from '../../shared/types/entities.types';
import { API_BASE } from '../../shared/lib/api';

const STRATA_ROLES = ['Property Manager', 'Councillor'];

const StrataMembers = () => {
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [currentUser, setCurrentUser] = useState<StrataMemberInfo | null>(null);
  const [otherMembers, setOtherMembers] = useState<StrataMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Strata Section / Property types state
  const [currentUserPropertyTypes, setCurrentUserPropertyTypes] = useState<PropertyType[]>([]);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState<PropertyType[]>([]);
  const [selectedPropertyTypeIds, setSelectedPropertyTypeIds] = useState<number[]>([]);
  const [sectionRequestSaving, setSectionRequestSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    companyName: '',
  });
  const [role, setRole] = useState('');

  const fetchMembers = async () => {
    if (!user || user.role !== 'client') return;

    try {
      const { data: userStrataProfile, error: strataError } = await supabase
        .from('strata_profiles')
        .select('strata_id')
        .eq('profile_id', user.id)
        .single();

      if (strataError) throw strataError;
      if (!userStrataProfile) throw new Error('No strata association found');

      const { data: members, error: membersError } = await supabase
        .from('strata_profiles')
        .select(`
          strata_position,
          profile:profile_id (
            id,
            first_name,
            last_name,
            email,
            phone_number,
            company_name
          )
        `)
        .eq('strata_id', userStrataProfile.strata_id);

      if (membersError) throw membersError;

      const mapped: StrataMemberInfo[] = (members || []).map((m) => {
        const p = m.profile as unknown as StrataProfileResult;
        return {
          profileId: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
          phoneNumber: p.phone_number,
          position: m.strata_position,
          companyName: p.company_name,
        };
      });

      setCurrentUser(mapped.find((m) => m.profileId === user.id) || null);
      setOtherMembers(mapped.filter((m) => m.profileId !== user.id));
    } catch (err) {
      console.error(err);
      setError('Failed to load strata members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProfile = async (): Promise<PropertyType[]> => {
    try {
      const res = await authFetch(`${API_BASE}/client/profile`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.propertyTypes)) {
        const types: PropertyType[] = data.data.propertyTypes;
        setCurrentUserPropertyTypes(types);
        return types;
      }
    } catch (err) {
      console.error('Failed to fetch client profile:', err);
    }
    return [];
  };

  const fetchAvailablePropertyTypes = async () => {
    try {
      const res = await authFetch(`${API_BASE}/lookups/property-types`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailablePropertyTypes(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch property types:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchClientProfile();
  }, [user]);

  const openUpdateModal = () => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      phoneNumber: currentUser.phoneNumber || '',
      companyName: currentUser.companyName || '',
    });
    setRole(currentUser.position || '');
    setIsModalOpen(true);
  };

  const openSectionModal = async () => {
    // Re-fetch fresh data to avoid stale state before pre-selecting
    const [freshTypes] = await Promise.all([
      fetchClientProfile(),
      fetchAvailablePropertyTypes(),
    ]);
    setSelectedPropertyTypeIds(freshTypes.map((p) => p.propertyTypeId));
    setIsSectionModalOpen(true);
  };

  const handleSectionRequestToggle = (id: number) => {
    setSelectedPropertyTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSectionRequestSubmit = async () => {
    if (selectedPropertyTypeIds.length === 0) {
      alert('Please select at least one property type.');
      return;
    }
    setSectionRequestSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/client/profile/request-section-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyTypeIds: selectedPropertyTypeIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit request');
      }
      setIsSectionModalOpen(false);
      setSuccessMessage('Section change request submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'Failed to submit section change request.');
    } finally {
      setSectionRequestSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user || !currentUser) return;
    setSaving(true);

    try {
      const response = await authFetch(`${API_BASE}/client/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          strataPosition: role,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setCurrentUser((prev) =>
        prev ? { ...prev, ...formData, position: role } : prev
      );
      setIsModalOpen(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const renderMemberCard = (
    member: StrataMemberInfo,
    title: string,
    isCurrentUser: boolean
  ) => {
    const fullName =
      [member.firstName, member.lastName].filter(Boolean).join(' ') || 'N/A';

    const propertyTypeLabel =
      currentUserPropertyTypes.length > 0
        ? currentUserPropertyTypes.map((p) => p.propertyTypeName).join(', ')
        : 'N/A';

    return (
      <div key={member.profileId} className="strata-members__card">
        <div className="strata-members__card-header">
          <h2>{title}</h2>
          <span className="strata-members__badge">
            {member.position || 'N/A'}
          </span>
        </div>

        <div className="strata-members__table">
          <div className="strata-members__table-header">
            <span>Name</span>
            <span>Strata Section</span>
            <span>{isCurrentUser ? '' : 'Phone Number'}</span>
          </div>
          <div className="strata-members__table-row">
            <span>{fullName}</span>
            {isCurrentUser ? (
              <>
                <span>{propertyTypeLabel}</span>
                <span className="strata-members__request-cell">
                  <button
                    className="strata-members__request-btn"
                    onClick={openSectionModal}
                  >
                    Request Section Change
                  </button>
                </span>
              </>
            ) : (
              <>
                <span>{member.email || 'N/A'}</span>
                <span>{member.phoneNumber || 'N/A'}</span>
              </>
            )}
          </div>
        </div>

        {isCurrentUser && (
          <button className="strata-members__update-btn" onClick={openUpdateModal}>
            Update Your Details
          </button>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="page-container">
        <h1>Strata Members</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Strata Members</h1>
      <p className="page-subtitle">
        The following members are associated with your strata
      </p>

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      {currentUser && renderMemberCard(currentUser, 'Your Personal Details', true)}

      {otherMembers.map((member) =>
        renderMemberCard(member, 'Alternative Site Contact', false)
      )}

      {/* Update Personal Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Personal Details"
        footer={
          <div className="modal-footer-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="update-details-form">
          <FormRow>
            <InputField
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
            />
            <InputField
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Phone Number"
              required
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
            />
            <InputField
              label="Associated Company"
              value={formData.companyName}
              placeholder="Enter company name"
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, companyName: e.target.value }))
              }
            />
          </FormRow>

          <div className="strata-members__role-field" style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="strata-members__role-label" style={{ marginBottom: '0.75rem' }}>Strata Role</label>
            <div className="strata-members__role-options" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
              {STRATA_ROLES.map((r) => (
                <label key={r} className="strata-members__role-checkbox" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    style={{ margin: 0 }}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          <div className="login-details-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1a1a1a' }}>Login Details</h3>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                <div style={{ fontSize: '0.875rem', color: '#111827' }}>{currentUser?.email || user?.email}</div>
              </div>
              <button
                type="button"
                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                onClick={async () => {
                  try {
                    const emailToReset = currentUser?.email || user?.email;
                    if (!emailToReset) throw new Error('No email found');
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailToReset);
                    if (resetError) throw resetError;
                    setSuccessMessage('Password reset email sent. Please check your inbox.');
                    setIsModalOpen(false);
                  } catch (err) {
                    console.error('Password reset error:', err);
                    alert('Failed to send password reset email. Please try again.');
                  }
                }}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Request Section Change Modal */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title="Request Section Change"
        footer={
          <div className="modal-footer-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setIsSectionModalOpen(false)}
              disabled={sectionRequestSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSectionRequestSubmit}
              disabled={sectionRequestSaving || selectedPropertyTypeIds.length === 0}
            >
              {sectionRequestSaving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        }
      >
        <div className="section-request-form">
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.25rem' }}>
            Select the property type(s) you'd like to be assigned to. Your request will be reviewed by the administrator.
          </p>
          <div className="strata-members__section-options">
            {availablePropertyTypes.map((pt) => (
              <label
                key={pt.propertyTypeId}
                className="strata-members__section-checkbox"
              >
                <input
                  type="checkbox"
                  checked={selectedPropertyTypeIds.includes(pt.propertyTypeId)}
                  onChange={() => handleSectionRequestToggle(pt.propertyTypeId)}
                />
                {pt.propertyTypeName}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StrataMembers;
