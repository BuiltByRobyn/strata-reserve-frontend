import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import type { StrataMemberInfo } from '../../shared/types/entities.types';
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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
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
            phone_number
          )
        `)
        .eq('strata_id', userStrataProfile.strata_id);

      if (membersError) throw membersError;

      const mapped: StrataMemberInfo[] = (members || []).map((m) => {
        const p = m.profile as any;
        return {
          profileId: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
          phoneNumber: p.phone_number,
          position: m.strata_position,
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

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const openUpdateModal = () => {
    if (!currentUser) return;
    setFormData({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      phoneNumber: currentUser.phoneNumber || '',
    });
    setRole(currentUser.position || '');
    setIsModalOpen(true);
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
            <span>Email</span>
            <span>Phone Number</span>
          </div>
          <div className="strata-members__table-row">
            <span>{fullName}</span>
            <span>{member.email || 'N/A'}</span>
            <span>{member.phoneNumber || 'N/A'}</span>
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
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
            />
            <InputField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
            />
          </FormRow>

          <div className="strata-members__role-field">
            <label className="strata-members__role-label">Strata Role</label>
            <div className="strata-members__role-options">
              {STRATA_ROLES.map((r) => (
                <label key={r} className="strata-members__role-checkbox">
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StrataMembers;
