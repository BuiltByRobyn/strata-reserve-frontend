import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { Modal } from '../../shared/components/Modal/Modal';
import { InputField, FormRow } from '../../shared/components/FormField/FormField';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MemberInfo {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  position: string | null;
}

interface UpdateFormData {
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  officeNumber: string;
  role: string;
}

const STRATA_ROLES = ['Property Manager', 'Councillor'];

const StrataMembers = () => {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [currentUser, setCurrentUser] = useState<MemberInfo | null>(null);
  const [otherMembers, setOtherMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateFormData>({
    firstName: '',
    lastName: '',
    email: '',
    cellNumber: '',
    officeNumber: '',
    role: '',
  });

  const fetchMembers = async () => {
    if (!user || user.role !== 'client') return;

    try {
      const { data: userStrataProfile, error: strataError } = await supabase
        .from('strata_profiles')
        .select('strata_id')
        .eq('profile_id', user.id)
        .limit(1)
        .single();

      if (strataError) throw strataError;
      if (!userStrataProfile) throw new Error('No strata association found');

      const strataId = userStrataProfile.strata_id;

      const { data: members, error: membersError } = await supabase
        .from('strata_profiles')
        .select(`
          strata_position,
          profile:profile_id (
            id,
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
        .eq('strata_id', strataId);

      if (membersError) throw membersError;

      const mapped: MemberInfo[] = (members || []).map((m) => {
        const p = m.profile as unknown as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone_number: string | null;
        };
        return {
          profileId: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
          phoneNumber: p.phone_number,
          position: m.strata_position,
        };
      });

      const me = mapped.find((m) => m.profileId === user.id) || null;
      const others = mapped.filter((m) => m.profileId !== user.id);

      setCurrentUser(me);
      setOtherMembers(others);
    } catch (err) {
      console.error('Error fetching strata members:', err);
      setError('Failed to load strata members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const openUpdateModal = () => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      email: currentUser.email || '',
      cellNumber: currentUser.phoneNumber || '',
      officeNumber: currentUser.phoneNumber || '',
      role: currentUser.position || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !currentUser) return;

    setSaving(true);
    try {
      // Update profile and strata position via backend API
      const response = await authFetch(`${API_BASE}/client/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.cellNumber,
          strataPosition: formData.role,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update local state so UI reflects changes
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phoneNumber: formData.cellNumber,
              position: formData.role,
            }
          : prev
      );
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating personal details:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <p className="strata-members__subtitle">The following members are associated with your strata</p>

      {currentUser && (
        <div className="strata-members__card">
          <div className="strata-members__card-header">
            <h2>Your Personal Details</h2>
            {currentUser.position && (
              <span className="strata-members__badge">{currentUser.position}</span>
            )}
          </div>
          <div className="strata-members__table">
            <div className="strata-members__table-header">
              <span>Name</span>
              <span>Email</span>
              <span>Cell</span>
              <span>Office</span>
            </div>
            <div className="strata-members__table-row">
              <span>{[currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || 'N/A'}</span>
              <span>{currentUser.email || 'N/A'}</span>
              <span>{currentUser.phoneNumber || 'N/A'}</span>
              <span>{currentUser.phoneNumber || 'N/A'}</span>
            </div>
          </div>
          <button
            className="strata-members__update-btn"
            onClick={openUpdateModal}
          >
            Update Your Details
          </button>
        </div>
      )}

      {otherMembers.map((member) => (
        <div key={member.profileId} className="strata-members__card">
          <div className="strata-members__card-header">
            <h2>Alternative Site Contact</h2>
            {member.position && (
              <span className="strata-members__badge">{member.position}</span>
            )}
          </div>
          <div className="strata-members__table">
            <div className="strata-members__table-header">
              <span>Name</span>
              <span>Email</span>
              <span>Cell</span>
              <span>Office</span>
            </div>
            <div className="strata-members__table-row">
              <span>{[member.firstName, member.lastName].filter(Boolean).join(' ') || 'N/A'}</span>
              <span>{member.email || 'N/A'}</span>
              <span>{member.phoneNumber || 'N/A'}</span>
              <span>{member.phoneNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      ))}

      {!currentUser && otherMembers.length === 0 && (
        <p>No members found for your strata.</p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Personal Details"
        size="large"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="update-details-form">
          <FormRow>
            <InputField
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
            />
            <InputField
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
            />
          </FormRow>
          <FormRow>
            <InputField
              label="Email"
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email"
            />
            <InputField
              label="Cell Number"
              required
              type="tel"
              value={formData.cellNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, cellNumber: e.target.value }))}
              placeholder="Enter cell number"
            />
          </FormRow>
          <FormRow>
            <InputField
              label="Office Number"
              required
              type="tel"
              value={formData.officeNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, officeNumber: e.target.value }))}
              placeholder="Enter office number"
            />
            <div className="strata-members__role-field">
              <span className="strata-members__role-label">
                Please select your strata role:
                <span className="required">*</span>
              </span>
              <div className="strata-members__role-options">
                {STRATA_ROLES.map((role) => (
                  <label key={role} className="strata-members__role-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.role === role}
                      onChange={() => setFormData((prev) => ({ ...prev, role }))}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          </FormRow>
        </div>
      </Modal>
    </div>
  );
};

export default StrataMembers;
