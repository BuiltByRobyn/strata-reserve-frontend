// Companies Page - Admin management of companies
import { useCallback } from 'react';
import { useCompanies } from '../../shared/hooks/useCompanies';
import { useCrudModal } from '../../shared/hooks/useCrudModal';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '../../shared/types/entities.types';

const INITIAL_FORM_DATA: CreateCompanyInput = {
  companyName: '',
  companyTelephone: ''
};

export default function CompaniesPage() {
  const {
    companies,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany
  } = useCompanies();

  const {
    isModalOpen,
    editingItem: editingCompany,
    formData,
    setFormData,
    formError,
    isSubmitting,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
  } = useCrudModal<Company, CreateCompanyInput>({
    initialFormData: INITIAL_FORM_DATA,
    itemToFormData: useCallback((c: Company) => ({
      companyName: c.companyName,
      companyTelephone: c.companyTelephone || '',
    }), []),
    onSubmit: useCallback(async (data: CreateCompanyInput, editing: Company | null) => {
      if (!data.companyName.trim()) throw new Error('Company name is required');
      if (editing) {
        const updateData: UpdateCompanyInput = {
          companyName: data.companyName.trim(),
          companyTelephone: data.companyTelephone?.trim() || null,
        };
        await updateCompany(editing.companyId, updateData);
      } else {
        await createCompany(data);
      }
    }, [createCompany, updateCompany]),
  });

  const columns: Column<Company>[] = [
    { key: 'companyName', header: 'Company Name' },
    { key: 'companyTelephone', header: 'Telephone' },
    {
      key: '_count',
      header: 'Properties',
      render: (company) => company._count?.stratas ?? 0
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (company) => new Date(company.createdAt).toLocaleDateString()
    }
  ];

  const handleDelete = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete "${company.companyName}"?`)) {
      return;
    }

    try {
      await deleteCompany(company.companyId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete company');
    }
  };

  return (
    <div className="companies-page">
      <div className="page-header">
        <h1>Companies</h1>
        <button className="btn-primary" onClick={openCreateModal}>
          + Add Company
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={companies}
        keyExtractor={(c) => c.companyId}
        loading={loading}
        emptyMessage="No companies found. Click 'Add Company' to create one."
        actions={(company) => (
          <>
            <button
              className="btn-edit"
              onClick={() => openEditModal(company)}
            >
              Edit
            </button>
            <button
              className="btn-delete"
              onClick={() => handleDelete(company)}
            >
              Delete
            </button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        size="small"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="form-error">{formError}</div>
          )}
          <InputField
            label="Company Name"
            required
            value={formData.companyName}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyName: e.target.value
            }))}
            placeholder="Enter company name"
          />
          <InputField
            label="Telephone"
            type="tel"
            value={formData.companyTelephone || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyTelephone: e.target.value
            }))}
            placeholder="Enter phone number"
          />
        </form>
      </Modal>
    </div>
  );
}
