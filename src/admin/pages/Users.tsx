// Users Page - Admin management of users
import { useState, useMemo } from 'react';
import { useUsers } from '../../shared/hooks/useUsers';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import type { UserWithStratas, CreateUserInput, UserFormData } from '../../shared/types/entities.types';

const initialFormData: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  userTypeId: undefined,
  companyName: '',
  strataAssociations: [{ strataId: 0, strataPosition: '', sectionIds: [] }]
};

export default function UsersPage() {
  const { users, loading, error, createUser, updateUser, deleteUser } = useUsers();
  const { stratas } = useStrata();
  const { userTypes, sections } = useLookups();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStratas | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStratas | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserWithStratas | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStrataName, setFilterStrataName] = useState<string>('');
  const [filterStrataPlan, setFilterStrataPlan] = useState<string>('');
  const [filterUserTypeId, setFilterUserTypeId] = useState<string>('');
  const [filterSectionId, setFilterSectionId] = useState<number[]>([]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        if (!name.includes(search) && !email.includes(search)) {
          return false;
        }
      }

      if (filterStrataName) {
        const hasStrata = user.strataProfiles?.some(
          se => se.strata.strataId === parseInt(filterStrataName)
        );
        if (!hasStrata) return false;
      }

      if (filterStrataPlan) {
        const hasStrata = user.strataProfiles?.some(
          se => se.strata.strataId === parseInt(filterStrataPlan)
        );
        if (!hasStrata) return false;
      }

      // User type filter
      if (filterUserTypeId) {
        if (user.userTypeId !== parseInt(filterUserTypeId)) {
          return false;
        }
      }

      // Section filter
      if (filterSectionId.length > 0) {
        const hasSection = user.strataProfiles?.some(
          se => se.strataProfileSections?.some(
            sps => filterSectionId.includes(sps.sectionId)
          )
        );
        if (!hasSection) return false;
      }

      return true;
    });
  }, [users, searchTerm, filterStrataName, filterStrataPlan, filterUserTypeId, filterSectionId]);

  const isDesktop = useMediaQuery('(min-width: 750px)');

  const mobileColumns: Column<UserWithStratas>[] = [
    {
      key: 'fullName',
      header: 'Name',
      render: (user) => `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'
    }
  ];

  const desktopColumns: Column<UserWithStratas>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => user.email || '-'
    },
    {
      key: 'userType',
      header: 'User Type',
      render: (user) => user.userType?.userTypeName || '-'
    },
    {
      key: 'strataId',
      header: 'Strata ID',
      render: (user) => {
        const ids = user.strataProfiles?.length
          ? user.strataProfiles
              .map(se => se.strata.strataPlan ?? String(se.strata.strataId))
              .filter(Boolean)
              .join(', ') || 'N/A'
          : 'N/A';
        return ids;
      }
    },
    {
      key: 'company',
      header: 'Management Company',
      render: (user) => {
        const companies = user.strataProfiles
          ?.map(se => se.strata.company?.companyName)
          .filter(Boolean);
        const unique = companies?.length ? [...new Set(companies)] : [];
        if (unique.length) return unique.join(', ');
        return user.companyName || 'N/A';
      }
    }
  ];

  const getViewUserRows = (user: UserWithStratas): { label: string; value: string }[] => {
    const companies = user.strataProfiles
      ?.map(se => se.strata.company?.companyName)
      .filter(Boolean);
    const uniqueCompanies = companies?.length ? [...new Set(companies)] : [];
    const associatedCompany = uniqueCompanies.length
      ? uniqueCompanies.join(', ')
      : (user.companyName || 'N/A');

    const associatedStrata = user.strataProfiles?.length
      ? user.strataProfiles
          .map(se => se.strata.complexName || se.strata.strataPlan || '')
          .filter(Boolean)
          .join(', ') || 'N/A'
      : 'N/A';

    const strataIds = user.strataProfiles?.length
      ? user.strataProfiles
          .map(se => se.strata.strataPlan ?? String(se.strata.strataId))
          .filter(Boolean)
          .join(', ') || 'N/A'
      : 'N/A';

    return [
      { label: 'First name', value: user.firstName ?? '-' },
      { label: 'Last name', value: user.lastName ?? '-' },
      { label: 'Email', value: user.email ?? '-' },
      { label: 'Phone Number', value: user.phoneNumber ?? '-' },
      { label: 'User Type', value: user.userType?.userTypeName ?? '-' },
      { label: 'Associated Company', value: associatedCompany },
      { label: 'Associated Strata', value: associatedStrata },
      { label: 'Strata ID', value: strataIds }
    ];
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserWithStratas) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      userTypeId: user.userTypeId || undefined,
      companyName: '',
      strataAssociations: user.strataProfiles?.length
        ? user.strataProfiles.map(se => ({
            strataId: se.strata.strataId,
            strataPosition: se.strataPosition || '',
            sectionIds: se.strataProfileSections?.map(sps => sps.sectionId) || []
          }))
        : [{ strataId: 0, strataPosition: '', sectionIds: [] as number[] }]
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      setFormError('First Name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setFormError('Last Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setFormError('Phone Number is required');
      return;
    }
    if (!formData.userTypeId) {
      setFormError('User Type is required');
      return;
    }

    const validAssociations = formData.strataAssociations.filter(sa => sa.strataId > 0);
    if (validAssociations.length === 0) {
      setFormError('At least one Strata association is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const input: CreateUserInput = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        userTypeId: formData.userTypeId,
        companyName: formData.companyName.trim() || undefined,
        strataAssociations: validAssociations
      };

      if (editingUser) {
        await updateUser(editingUser.id, input);
      } else {
        await createUser(input);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateStrataAssociation = (index: number, field: 'strataId' | 'strataPosition', value: string | number) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = {
        ...newAssociations[index],
        [field]: field === 'strataId' ? Number(value) : value
      };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const addStrataAssociation = () => {
    setFormData(prev => ({
      ...prev,
      strataAssociations: [...prev.strataAssociations, { strataId: 0, strataPosition: '', sectionIds: [] }]
    }));
  };

  const updateStrataAssociationSections = (index: number, sectionIds: number[]) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], sectionIds };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const removeStrataAssociation = (index: number) => {
    if (formData.strataAssociations.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      strataAssociations: prev.strataAssociations.filter((_, i) => i !== index)
    }));
  };

  const openDeleteModal = (user: UserWithStratas) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleteSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
    } catch (err) {
      // error is logged in the hook
    } finally {
      setDeleteSubmitting(false);
      setDeleteModalOpen(false);
      setIsModalOpen(false);
      setEditingUser(null);
      setUserToDelete(null);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Users</h1>
        <div className="create-user-button-desktop">
          <button className="btn-primary" onClick={openCreateModal}>
            + Create New Users
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="page-content">
        <div className="filters-row">
          <InputField
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or email..."
          />
          <SingleSelectDropdown
            label="Strata Name"
            value={filterStrataName}
            onChange={(val) => setFilterStrataName(val)}
            options={stratas.filter(s => s.complexName).map(s => ({ value: s.strataId, label: s.complexName! }))}
            placeholder="All Strata"
          />
          <SingleSelectDropdown
            label="Strata Plan"
            value={filterStrataPlan}
            onChange={(val) => setFilterStrataPlan(val)}
            options={stratas.filter(s => s.strataPlan).map(s => ({ value: s.strataId, label: s.strataPlan! }))}
            placeholder="All Plans"
          />
          <SingleSelectDropdown
            label="Role"
            value={filterUserTypeId}
            onChange={(val) => setFilterUserTypeId(val)}
            options={userTypes.map(ut => ({ value: ut.userTypeId, label: ut.userTypeName }))}
            placeholder="All Roles"
          />
          <MultiSelectDropdown
            label="Sections"
            options={sections.map(s => ({ value: s.sectionId, label: s.sectionName }))}
            selectedValues={filterSectionId}
            onChange={setFilterSectionId}
            placeholder="All Sections"
          />
        </div>
      </div>

      <div className="create-user-button">
        <button className="btn-primary" onClick={openCreateModal}>
          + Create New Users
        </button>
      </div>

      <DataTable
        title={isDesktop ? undefined : 'Users'}
        columns={isDesktop ? desktopColumns : mobileColumns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        onRowClick={(user) => {
          setViewingUser(user);
          setIsViewModalOpen(true);
        }}
        loading={loading}
        emptyMessage="No users found. Click 'Create New Users' to add one."
        actions={(user) => (
          <button className="btn-edit" onClick={() => openEditModal(user)}>
            Edit
          </button>
        )}
        actionsColumnHeader="Action"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="large"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            {editingUser && (
              <button
                className="btn-delete"
                onClick={() => openDeleteModal(editingUser)}
                disabled={isSubmitting}
              >
                Delete User
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          <FormRow>
            <InputField
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              placeholder="Enter first name"
            />
            <InputField
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              placeholder="Enter last name"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="user@example.com"
              disabled={!!editingUser}
            />
            <InputField
              label="Phone Number"
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              placeholder="Enter phone number"
            />
          </FormRow>

          <FormRow>
            <SingleSelectDropdown
              label="User Type"
              required
              value={formData.userTypeId?.toString() || ''}
              onChange={(val) => updateField('userTypeId', val ? parseInt(val) : undefined)}
              options={userTypes.map(ut => ({
                value: ut.userTypeId,
                label: ut.userTypeName
              }))}
              placeholder="--- Select User Type ---"
            />
            <InputField
              label="Associated Company"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Enter company name"
            />
          </FormRow>

          {/* Strata Associations */}
          {formData.strataAssociations.map((association, index) => {
            const selectedStrata = stratas.find(s => s.strataId === association.strataId);
            const otherSelectedIds = formData.strataAssociations
              .filter((_, i) => i !== index)
              .map(a => a.strataId)
              .filter(id => id > 0);
            const availableStratas = stratas.filter(s => !otherSelectedIds.includes(s.strataId));

            return (
              <div key={index} className="strata-association-row">
                <FormRow>
                  <SingleSelectDropdown
                    label={`Strata Plan${index === 0 ? '' : ` ${index + 1}`}`}
                    required
                    value={association.strataId?.toString() || ''}
                    onChange={(val) => {
                      updateStrataAssociation(index, 'strataId', val);
                      updateStrataAssociationSections(index, []);
                    }}
                    options={availableStratas.map(s => ({
                      value: s.strataId,
                      label: s.strataPlan || s.complexName || `Strata ${s.strataId}`
                    }))}
                    placeholder="Select Strata Plan"
                  />
                  <InputField
                    label={`Associated Strata${index === 0 ? '' : ` ${index + 1}`}`}
                    required
                    value={selectedStrata?.complexName || ''}
                    disabled
                    placeholder="Strata name"
                  />
                </FormRow>
                <MultiSelectDropdown
                  label={`Sections${index === 0 ? '' : ` ${index + 1}`}`}
                  options={sections.map(s => ({ value: s.sectionId, label: s.sectionName }))}
                  selectedValues={association.sectionIds || []}
                  onChange={(values) => updateStrataAssociationSections(index, values)}
                  placeholder="Select sections"
                />
                {index > 0 && (
                  <button
                    type="button"
                    className="btn-remove-strata"
                    onClick={() => removeStrataAssociation(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          <div className="add-strata-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.strataAssociations.length > 1}
                onChange={(e) => {
                  if (e.target.checked && formData.strataAssociations.length === 1) {
                    addStrataAssociation();
                  } else if (!e.target.checked && formData.strataAssociations.length > 1) {
                    setFormData(prev => ({
                      ...prev,
                      strataAssociations: [prev.strataAssociations[0]]
                    }));
                  }
                }}
              />
              <span>Add Another Strata Association?</span>
            </label>
          </div>

          {formData.strataAssociations.length > 1 && (
            <button
              type="button"
              className="btn-add-strata"
              onClick={addStrataAssociation}
            >
              + Add Another Strata
            </button>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingUser(null);
        }}
        title="View User"
        size="medium"
        footer={
          <button
            className="btn-primary"
            onClick={() => {
              setIsViewModalOpen(false);
              setViewingUser(null);
            }}
          >
            Close
          </button>
        }
      >
        {viewingUser && (
          <table className="view-user-table">
            <tbody>
              {getViewUserRows(viewingUser).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setUserToDelete(null); }}
        title="Delete User"
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setDeleteModalOpen(false); setUserToDelete(null); }}>
              Cancel
            </button>
            <button
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? 'Deleting...' : 'Delete User'}
            </button>
          </>
        }
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete user "{userToDelete ? `${userToDelete.firstName || ''} ${userToDelete.lastName || ''}`.trim() || userToDelete.email : ''}"?</p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
