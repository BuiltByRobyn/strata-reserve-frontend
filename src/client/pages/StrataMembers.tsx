import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';
import { Modal } from '../../shared/components/Modal/Modal';
import { InputField, FormRow } from '../../shared/components/FormField/FormField';
import type {
  StrataMemberInfo,
  UpdateProfileInput,
} from '../../shared/types/entities.types';
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

  const [formData, setFormData] = useState<UpdateProfileInput>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  const [role, setRole] = useState<string>('');

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
        prev
          ? {
              ...prev,
              ...formData,
              position: role,
            }
          : prev
      );

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
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

      {currentUser && (
        <div className="strata-members__card">
          <h2>Your Personal Details</h2>
          <p>
            {[currentUser.firstName, currentUser.lastName]
              .filter(Boolean)
              .join(' ') || 'N/A'}
          </p>
          <p>{currentUser.email || 'N/A'}</p>
          <p>{currentUser.phoneNumber || 'N/A'}</p>
          <p>{currentUser.position || 'N/A'}</p>

          <button onClick={openUpdateModal}>
            Update Your Details
          </button>
        </div>
      )}

      {otherMembers.map((member) => (
        <div key={member.profileId} className="strata-members__card">
          <h2>Alternative Site Contact</h2>
          <p>
            {[member.firstName, member.lastName]
              .filter(Boolean)
              .join(' ') || 'N/A'}
          </p>
          <p>{member.email || 'N/A'}</p>
          <p>{member.phoneNumber || 'N/A'}</p>
          <p>{member.position || 'N/A'}</p>
        </div>
      ))}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Personal Details"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <FormRow>
          <InputField
            label="First Name"
            value={formData.firstName || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                firstName: e.target.value,
              }))
            }
          />
          <InputField
            label="Last Name"
            value={formData.lastName || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                lastName: e.target.value,
              }))
            }
          />
        </FormRow>

        <FormRow>
          <InputField
            label="Phone Number"
            value={formData.phoneNumber || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                phoneNumber: e.target.value,
              }))
            }
          />
        </FormRow>

        <div>
          <label>Strata Role</label>
          {STRATA_ROLES.map((r) => (
            <label key={r}>
              <input
                type="radio"
                checked={role === r}
                onChange={() => setRole(r)}
              />
              {r}
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default StrataMembers;
