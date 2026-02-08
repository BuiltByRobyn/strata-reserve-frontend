// Strata Page - Admin management of strata properties
import { useState } from "react";
import { useStrata } from "../../shared/hooks/useStrata";
import { useLookups } from "../../shared/hooks/useLookups";
import { useCompanies } from "../../shared/hooks/useCompanies";
import {
  DataTable,
  type Column,
} from "../../shared/components/DataTable/DataTable";
import { Modal } from "../../shared/components/Modal/Modal";
import {
  InputField,
  SelectField,
  FormRow,
} from "../../shared/components/FormField/FormField";
import type {
  Strata,
  CreateStrataInput,
  UpdateStrataInput,
} from "../../shared/types/entities.types";

export default function StrataPage() {
  const { stratas, loading, error, createStrata, updateStrata, deleteStrata } =
    useStrata();

  const { legalTypes, propertyTypes } = useLookups();
  const { companies } = useCompanies();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrata, setEditingStrata] = useState<Strata | null>(null);
  const [formData, setFormData] = useState<CreateStrataInput>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columns: Column<Strata>[] = [
    { key: "strataPlan", header: "Strata Plan" },
    { key: "complexName", header: "Complex Name" },
    { key: "streetName", header: "Address" },
    { key: "town", header: "Town" },
    {
      key: "company",
      header: "Company",
      render: (strata) => strata.company?.companyName ?? "-",
    },
    {
      key: "propertyType",
      header: "Type",
      render: (strata) => strata.propertyType?.propertyTypeName ?? "-",
    },
  ];

  const openCreateModal = () => {
    setEditingStrata(null);
    setFormData({ country: "Canada" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (strata: Strata) => {
    setEditingStrata(strata);
    setFormData({
      strataPlan: strata.strataPlan || "",
      complexName: strata.complexName || "",
      unitNumber: strata.unitNumber || "",
      streetName: strata.streetName || "",
      town: strata.town || "",
      province: strata.province || "",
      postalCode: strata.postalCode || "",
      country: strata.country || "Canada",
      website: strata.website || "",
      legalTypeId: strata.legalTypeId || undefined,
      propertyTypeId: strata.propertyTypeId || undefined,
      companyId: strata.companyId || undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingStrata) {
        const updateData: UpdateStrataInput = { ...formData };
        await updateStrata(editingStrata.strataId, updateData);
      } else {
        await createStrata(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (strata: Strata) => {
    if (
      !confirm(
        `Are you sure you want to delete "${strata.strataPlan || strata.complexName}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteStrata(strata.strataId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete strata");
    }
  };

  const updateField = (
    field: keyof CreateStrataInput,
    value: string | number | undefined,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="strata-page">
      <div className="page-header">
        <h1>Strata Properties</h1>
        <button className="btn-primary" onClick={openCreateModal}>
          + Add Strata
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable
        columns={columns}
        data={stratas}
        keyExtractor={(s) => s.strataId}
        loading={loading}
        emptyMessage="No strata properties found. Click 'Add Strata' to create one."
        actions={(strata) => (
          <>
            <button className="btn-edit" onClick={() => openEditModal(strata)}>
              Edit
            </button>
            <button className="btn-delete" onClick={() => handleDelete(strata)}>
              Delete
            </button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStrata ? "Edit Strata" : "Add Strata"}
        size="large"
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
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          <FormRow>
            <InputField
              label="Strata Plan"
              value={formData.strataPlan || ""}
              onChange={(e) => updateField("strataPlan", e.target.value)}
              placeholder="e.g., VIS 2345"
            />
            <InputField
              label="Complex Name"
              value={formData.complexName || ""}
              onChange={(e) => updateField("complexName", e.target.value)}
              placeholder="e.g., Maple Gardens"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Unit Number"
              value={formData.unitNumber || ""}
              onChange={(e) => updateField("unitNumber", e.target.value)}
              placeholder="e.g., 101"
            />
            <InputField
              label="Street Name"
              value={formData.streetName || ""}
              onChange={(e) => updateField("streetName", e.target.value)}
              placeholder="e.g., 123 Main St"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Town/City"
              value={formData.town || ""}
              onChange={(e) => updateField("town", e.target.value)}
              placeholder="e.g., Vancouver"
            />
            <InputField
              label="Province"
              value={formData.province || ""}
              onChange={(e) => updateField("province", e.target.value)}
              placeholder="e.g., BC"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Postal Code"
              value={formData.postalCode || ""}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="e.g., V6B 1A1"
            />
            <InputField
              label="Country"
              value={formData.country || "Canada"}
              onChange={(e) => updateField("country", e.target.value)}
            />
          </FormRow>

          <InputField
            label="Website"
            type="url"
            value={formData.website || ""}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://example.com"
          />

          <FormRow>
            <SelectField
              label="Legal Type"
              value={formData.legalTypeId?.toString() || ""}
              onChange={(e) =>
                updateField(
                  "legalTypeId",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              options={legalTypes.map((lt) => ({
                value: lt.legalTypeId,
                label: lt.legalTypeName,
              }))}
              placeholder="Select legal type"
            />
            <SelectField
              label="Property Type"
              value={formData.propertyTypeId?.toString() || ""}
              onChange={(e) =>
                updateField(
                  "propertyTypeId",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              options={propertyTypes.map((pt) => ({
                value: pt.propertyTypeId,
                label: pt.propertyTypeName,
              }))}
              placeholder="Select property type"
            />
          </FormRow>

          <SelectField
            label="Company"
            value={formData.companyId?.toString() || ""}
            onChange={(e) =>
              updateField(
                "companyId",
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            options={companies.map((c) => ({
              value: c.companyId,
              label: c.companyName,
            }))}
            placeholder="Select company"
          />
        </form>
      </Modal>
    </div>
  );
}
