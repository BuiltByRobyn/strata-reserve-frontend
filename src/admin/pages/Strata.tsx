import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStrata } from "../../shared/hooks/useStrata";
import { useLookups } from "../../shared/hooks/useLookups";
import { useMediaQuery } from "../../shared/hooks/useMediaQuery";
import {
  DataTable,
  type Column,
} from "../../shared/components/DataTable";
import { Modal } from "../../shared/components/Modal";
import {
  InputField,
  FormRow,
} from "../../shared/components/FormField";
import { SingleSelectDropdown } from "../../shared/components/SingleSelectDropdown";
import { MultiSelectDropdown } from "../../shared/components/MultiSelectDropdown";
import type {
  Strata,
  CreateStrataInput,
  UpdateStrataInput,
} from "../../shared/types/entities.types";
import { formatStrataId, validateStrataId } from "../../shared/utils/strataUtils";

export default function StrataPage() {
  const { stratas, loading, error, createStrata, updateStrata, deleteStrata } =
    useStrata();
  const { legalTypes, propertyTypes } = useLookups();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrata, setEditingStrata] = useState<Strata | null>(null);
  const [formData, setFormData] = useState<CreateStrataInput>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterStrataName, setFilterStrataName] = useState("");
  const [filterStrataPlan, setFilterStrataPlan] = useState("");
  const [filterPropertyTypeIds, setFilterPropertyTypeIds] = useState<number[]>([]);
  const [filterCity, setFilterCity] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 750px)");

  const cities = useMemo(
    () =>
      [...new Set(stratas.map((s) => s.town).filter(Boolean))].sort() as string[],
    [stratas]
  );

  const [filteredStratas, setFilteredStratas] = useState<Strata[]>([]);

  useEffect(() => {
    let result = stratas;

    if (!showArchived) {
      result = result.filter((s) => (s._count?.serviceRequests ?? 0) > 0);
    }

    if (filterStrataName) {
      result = result.filter((s) => s.strataId === parseInt(filterStrataName));
    }

    if (filterStrataPlan) {
      result = result.filter((s) => s.strataId === parseInt(filterStrataPlan));
    }

    if (filterPropertyTypeIds.length > 0) {
      result = result.filter((s) =>
        s.strataPropertyTypes?.some((spt) => filterPropertyTypeIds.includes(spt.propertyTypeId))
      );
    }

    if (filterCity) {
      result = result.filter(
        (s) => (s.town || "").toLowerCase() === filterCity.toLowerCase()
      );
    }

    setFilteredStratas(result);
  }, [stratas, filterStrataName, filterStrataPlan, filterPropertyTypeIds, filterCity, showArchived]);

  const desktopColumns: Column<Strata>[] = [
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
      key: "propertyTypes",
      header: "Type",
      render: (strata) =>
        strata.strataPropertyTypes?.length
          ? strata.strataPropertyTypes.map((spt) => spt.propertyType.propertyTypeName).join(", ")
          : strata.propertyType?.propertyTypeName ?? "-",
    },
  ];

  const mobileColumns: Column<Strata>[] = [
    { key: "strataPlan", header: "Strata Plan" },
    {
      key: "complexName",
      header: "Complex Name",
      render: (strata) => strata.complexName || "-",
    },
  ];

  const openCreateModal = () => {
    setEditingStrata(null);
    setFormData({ country: "Canada", propertyTypeIds: [] });
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
      companyId: strata.companyId || undefined,
      fiscalYearEnd: strata.fiscalYearEnd ? strata.fiscalYearEnd.split('T')[0] : undefined,
      propertyTypeIds: strata.strataPropertyTypes?.map(spt => spt.propertyTypeId) || [],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStrataId(formData.strataPlan || '')) {
      setFormError('Strata Plan must be in format: ABC 12345 (3 letters, space, 5 digits)');
      return;
    }

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
        <h1>Strata List</h1>
        <div className="add-strata-button-desktop">
          <button className="btn-primary" onClick={openCreateModal}>
            + Create New Strata
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="filters-row">
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
          <MultiSelectDropdown
            label="Property Types"
            options={propertyTypes.map((pt) => ({
              value: pt.propertyTypeId,
              label: pt.propertyTypeName,
            })).sort((a, b) => a.label.localeCompare(b.label))}
            selectedValues={filterPropertyTypeIds}
            onChange={setFilterPropertyTypeIds}
            placeholder="All Types"
          />
          <SingleSelectDropdown
            label="City"
            value={filterCity}
            onChange={(val) => setFilterCity(val)}
            options={cities.map((c) => ({ value: c, label: c }))}
            placeholder="All Cities"
          />
          <div className="form-field archived-toggle">
            <label>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(prev => !prev)}
              />
              Show Inactive
            </label>
          </div>
        </div>
      </div>

      <div className="add-strata-button">
        <button className="btn-primary" onClick={openCreateModal}>
          + Create New Strata
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <DataTable
        title={isDesktop ? undefined : 'Stratas'}
        columns={isDesktop ? desktopColumns : mobileColumns}
        data={filteredStratas}
        keyExtractor={(s) => s.strataId}
        loading={loading}
        emptyMessage="No strata properties found. Click 'Create New Strata' to create one."
        onRowClick={(strata) => navigate(`/admin/strata/${strata.strataId}`)}
        actions={(strata) => (
          <button
            className="btn-edit"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(strata);
            }}
          >
            Edit
          </button>
        )}
        actionsColumnHeader="Action"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStrata ? "Edit Strata" : "Create New Strata"}
        size="large"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            {editingStrata && (
              <button
                className="btn-delete"
                onClick={() => {
                  handleDelete(editingStrata);
                  setIsModalOpen(false);
                }}
                disabled={isSubmitting}
              >
                Delete Strata
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingStrata ? "Update Strata" : "Create Strata"}
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
              onChange={(e) => updateField("strataPlan", formatStrataId(e.target.value))}
              placeholder="e.g., VIS 23456"
              maxLength={9}
              required
            />
            <InputField
              label="Complex Name"
              value={formData.complexName || ""}
              onChange={(e) => updateField("complexName", e.target.value)}
              placeholder="e.g., Maple Gardens"
              required
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
              required
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Town/City"
              value={formData.town || ""}
              onChange={(e) => updateField("town", e.target.value)}
              placeholder="e.g., Vancouver"
              required
            />
            <SingleSelectDropdown
              label="Province"
              value={formData.province || ""}
              onChange={(val) => updateField("province", val)}
              options={[
                { value: "AB", label: "Alberta" },
                { value: "BC", label: "British Columbia" },
                { value: "MB", label: "Manitoba" },
                { value: "NB", label: "New Brunswick" },
                { value: "NL", label: "Newfoundland and Labrador" },
                { value: "NS", label: "Nova Scotia" },
                { value: "NT", label: "Northwest Territories" },
                { value: "NU", label: "Nunavut" },
                { value: "ON", label: "Ontario" },
                { value: "PE", label: "Prince Edward Island" },
                { value: "QC", label: "Quebec" },
                { value: "SK", label: "Saskatchewan" },
                { value: "YT", label: "Yukon" },
              ]}
              placeholder="Select province"
              required
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Postal Code"
              value={formData.postalCode || ""}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="e.g., V6B 1A1"
              required
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
            <InputField
              label="Company"
              value={formData.companyName || ""}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="Enter company name"
            />
            <SingleSelectDropdown
              label="Legal Type"
              value={formData.legalTypeId?.toString() || ""}
              onChange={(val) =>
                updateField(
                  "legalTypeId",
                  val ? parseInt(val) : undefined,
                )
              }
              options={legalTypes.map((lt) => ({
                value: lt.legalTypeId,
                label: lt.legalTypeName,
              }))}
              placeholder="Select legal type"
              required
            />
          </FormRow>

          <FormRow>
            <MultiSelectDropdown
              label="Property Types"
              options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
              selectedValues={formData.propertyTypeIds || []}
              onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))}
              placeholder="Select property types"
              required
            />
            <InputField
              label="Current Fiscal Year Start Date"
              type="date"
              value={formData.fiscalYearEnd || ''}
              onChange={(e) => updateField('fiscalYearEnd', e.target.value || undefined)}
              min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })()}
              max={new Date().toISOString().split('T')[0]}
            />
          </FormRow>
        </form>
      </Modal>
    </div>
  );
}
