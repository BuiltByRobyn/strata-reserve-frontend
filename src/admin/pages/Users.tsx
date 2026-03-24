// Users Page - Admin management of users
import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUsers } from '../../shared/hooks/useUsers';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import type { UserWithStratas, CreateUserInput, UserFormData } from '../../shared/types/entities.types';
import { formatPhoneNumber, validatePhoneNumber } from '../../shared/utils/strataUtils';

const initialFormData: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  userTypeId: undefined,
  companyName: '',
  strataAssociations: [{ strataId: 0, strataPosition: '', sectionIds: [], propertyTypeIds: [] }]
};

export default function UsersPage() {
  const { users, loading, error, createUser, updateUser, deleteUser } = useUsers();
  const { stratas } = useStrata();
  const { userTypes, propertyTypes } = useLookups();
  const location = useLocation();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStratas | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStratas | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserWithStratas | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStrataName, setFilterStrataName] = useState<string>('');
  const [filterStrataPlan, setFilterStrataPlan] = useState<string>('');
  const [filterUserTypeId, setFilterUserTypeId] = useState<string>('');
  const [filterPropertyTypeIds, setFilterPropertyTypeIds] = useState<number[]>([]);

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

      // Property type filter
      if (filterPropertyTypeIds.length > 0) {
        const hasType = user.strataProfiles?.some(
          se => se.strata.strataPropertyTypes?.some(
            spt => filterPropertyTypeIds.includes(spt.propertyTypeId)
          )
        );
        if (!hasType) return false;
      }

      return true;
    });
  }, [users, searchTerm, filterStrataName, filterStrataPlan, filterUserTypeId, filterPropertyTypeIds]);

  const isDesktop = useMediaQuery('(min-width: 750px)');

  const selectedUserType = userTypes.find(ut => ut.userTypeId === formData.userTypeId);
  const isClientType = selectedUserType?.userTypeName?.toLowerCase().replace(/-/g, ' ') === 'client';

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
          ?.map(se => se.strata.companyName)
          .filter(Boolean);
        const unique = companies?.length ? [...new Set(companies)] : [];
        if (unique.length) return unique.join(', ');
        return user.companyName || 'N/A';
      }
    }
  ];

  const getViewUserRows = (user: UserWithStratas): { label: string; value: string }[] => {
    const isClient = user.userType?.userTypeName?.toLowerCase().replace(/-/g, ' ') === 'client';

    const rows: { label: string; value: string }[] = [
      { label: 'First name', value: user.firstName ?? '-' },
      { label: 'Last name', value: user.lastName ?? '-' },
      { label: 'Email', value: user.email ?? '-' },
      { label: 'Phone Number', value: user.phoneNumber ?? '-' },
      { label: 'User Type', value: user.userType?.userTypeName ?? '-' },
    ];

    if (isClient) {
      const companies = user.strataProfiles
        ?.map(se => se.strata.companyName)
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

      const strataRoles = user.strataProfiles?.length
        ? user.strataProfiles
            .map(se => se.strataPosition)
            .filter(Boolean)
            .join(', ') || 'N/A'
        : 'N/A';

      rows.push(
        { label: 'Associated Company', value: associatedCompany },
        { label: 'Associated Strata', value: associatedStrata },
        { label: 'Strata ID', value: strataIds },
        { label: 'Strata Role', value: strataRoles },
      );
    }

    return rows;
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setFormError(null);
    setEmailError(null);
    setPhoneError(null);
    setIsModalOpen(true);
  };

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (location.state?.openCreate && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openCreateModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            sectionIds: se.strataProfileSections?.map(sps => sps.sectionId) || [],
            propertyTypeIds: se.strataProfilePropertyTypes?.map(sppt => sppt.propertyTypeId) || []
          }))
        : [{ strataId: 0, strataPosition: '', sectionIds: [] as number[], propertyTypeIds: [] as number[] }]
    });
    setFormError(null);
    setEmailError(null);
    setPhoneError(null);
    setIsModalOpen(true);
  };

  const validAssociations = formData.strataAssociations.filter(sa => sa.strataId > 0);

  const isFormValid =
    !!formData.firstName.trim() &&
    !!formData.lastName.trim() &&
    !!formData.email.trim() &&
    !emailError &&
    validatePhoneNumber(formData.phoneNumber) &&
    !phoneError &&
    !!formData.userTypeId &&
    (!isClientType || (
      validAssociations.length > 0 &&
      validAssociations.every(sa =>
        sa.propertyTypeIds && sa.propertyTypeIds.length > 0 &&
        (!!editingUser || !!sa.strataPosition)
      )
    ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const input: CreateUserInput = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        userTypeId: formData.userTypeId!,
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

  if (loading) return <LoadingSpinner />;

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

  const updateStrataAssociationSections = (index: number, sectionIds: number[]) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], sectionIds };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const updateStrataAssociationPropertyTypes = (index: number, propertyTypeIds: number[]) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], propertyTypeIds };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const openDeleteModal = (user: UserWithStratas) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteUser(userToDelete.id);
      setDeleteModalOpen(false);
      setIsModalOpen(false);
      setEditingUser(null);
      setUserToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleteSubmitting(false);
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
            options={stratas.filter(s => s.complexName).map(s => ({ value: s.strataId, label: s.complexName! })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Strata"
          />
          <SingleSelectDropdown
            label="Strata Plan"
            value={filterStrataPlan}
            onChange={(val) => setFilterStrataPlan(val)}
            options={stratas.filter(s => s.strataPlan).map(s => ({ value: s.strataId, label: s.strataPlan! })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Plans"
          />
          <SingleSelectDropdown
            label="Role"
            value={filterUserTypeId}
            onChange={(val) => setFilterUserTypeId(val)}
            options={userTypes.map(ut => ({ value: ut.userTypeId, label: ut.userTypeName.replace(/-/g, ' ') })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Roles"
          />
          <MultiSelectDropdown
            label="Property Types"
            options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
            selectedValues={filterPropertyTypeIds}
            onChange={setFilterPropertyTypeIds}
            placeholder="All Types"
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
        actions={isDesktop ? (user) => (
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(user); }}>
            Edit
          </button>
        ) : undefined}
        actionsColumnHeader="Action"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="large"
        className="modal-user-form"
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
              disabled={!isFormValid || isSubmitting}
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
              onChange={(e) => {
                const val = e.target.value;
                updateField('email', val);
                const trimmed = val.trim();
                if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  setEmailError('Please enter a valid email address');
                } else if (trimmed && users.some(u => u.id !== editingUser?.id && u.email?.toLowerCase() === trimmed.toLowerCase())) {
                  setEmailError('A user with this email already exists');
                } else {
                  setEmailError(null);
                }
              }}
              placeholder="user@example.com"
              disabled={!!editingUser}
              error={emailError || undefined}
            />
            <InputField
              label="Phone Number"
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => {
                const raw = e.target.value;
                updateField('phoneNumber', formatPhoneNumber(raw));
                setPhoneError(/[^0-9\s]/.test(raw) ? 'Format: 778 123 4567' : null);
              }}
              onBlur={() => {
                if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
                  setPhoneError('Format: 778 123 4567');
                }
              }}
              placeholder="778 123 4567"
              error={phoneError || undefined}
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
                label: ut.userTypeName.replace(/-/g, ' ')
              }))}
              placeholder="Select User Type"
            />
            {isClientType && (
              <InputField
                label="Strata Management Company (if applicable)"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="Enter strata management company name"
              />
            )}
          </FormRow>

          {/* Strata Associations */}
          {isClientType && formData.strataAssociations.map((association, index) => {
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
                      const newStrata = stratas.find(s => s.strataId === Number(val));
                      updateStrataAssociationPropertyTypes(index, newStrata?.strataPropertyTypes?.map(spt => spt.propertyType.propertyTypeId) || []);
                    }}
                    options={availableStratas.map(s => ({
                      value: s.strataId,
                      label: s.strataPlan || s.complexName || `Strata ${s.strataId}`
                    })).sort((a, b) => a.label.localeCompare(b.label))}
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
                {isClientType && (
                  <FormRow>
                    <MultiSelectDropdown
                      label={`Property Types${index === 0 ? '' : ` ${index + 1}`}`}
                      required
                      options={
                        (selectedStrata?.strataPropertyTypes ?? [])
                          .map(spt => ({ value: spt.propertyType.propertyTypeId, label: spt.propertyType.propertyTypeName }))
                          .sort((a, b) => a.label.localeCompare(b.label))
                      }
                      selectedValues={association.propertyTypeIds || []}
                      onChange={(values) => updateStrataAssociationPropertyTypes(index, values)}
                      placeholder="Select property types"
                    />
                    <div className="strata-role-field">
                      <div className="strata-role-field__header">
                        <label className="field-label">Strata Role <span className="required">*</span></label>
                        {association.strataId > 0 && !association.strataPosition && (
                          <span className="error-text">Please select a strata role</span>
                        )}
                      </div>
                      <div className="role-options">
                        {['Property Manager', 'Councillor'].map((r) => (
                          <label key={r} className="role-option">
                            <input
                              type="radio"
                              name={`role-${index}`}
                              checked={association.strataPosition === r}
                              onChange={() => updateStrataAssociation(index, 'strataPosition', r)}
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </div>
                  </FormRow>
                )}
              </div>
            );
          })}

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
          <>
            <button
              className={isDesktop ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingUser(null);
              }}
            >
              Close
            </button>
            {!isDesktop && viewingUser && (
              <button
                className="btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(viewingUser);
                  setViewingUser(null);
                }}
              >
                Edit
              </button>
            )}
          </>
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
        onClose={() => { setDeleteModalOpen(false); setUserToDelete(null); setDeleteError(null); }}
        title="Delete User"
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setDeleteModalOpen(false); setUserToDelete(null); setDeleteError(null); }}>
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
          {deleteError && <div className="form-error">{deleteError}</div>}
          <p>Are you sure you want to delete user "{userToDelete ? `${userToDelete.firstName || ''} ${userToDelete.lastName || ''}`.trim() || userToDelete.email : ''}"?</p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
