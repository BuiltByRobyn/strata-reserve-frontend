// Companies Page - Admin management of companies
import { useState } from 'react';
import { useCompanies } from '../../shared/hooks/useCompanies';
import { DataTable, type Column } from '../../shared/components/DataTable/DataTable';
import { Modal } from '../../shared/components/Modal/Modal';
import { InputField } from '../../shared/components/FormField/FormField';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '../../shared/types/entities.types';
import './Companies.scss';

export default function CompaniesPage() {
  const { 
    companies, 
    loading, 
    error, 
    createCompany, 
    updateCompany, 
    deleteCompany 
  } = useCompanies();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CreateCompanyInput>({
    companyName: '',
    companyTelephone: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormData({ companyName: '', companyTelephone: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      companyName: company.companyName,
      companyTelephone: company.companyTelephone || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      setFormError('Company name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingCompany) {
        const updateData: UpdateCompanyInput = {
          companyName: formData.companyName.trim(),
          companyTelephone: formData.companyTelephone?.trim() || null
        };
        await updateCompany(editingCompany.companyId, updateData);
      } else {
        await createCompany(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        size="small"
        footer={
          <>
            <button 
              className="btn-secondary" 
              onClick={() => setIsModalOpen(false)}
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
