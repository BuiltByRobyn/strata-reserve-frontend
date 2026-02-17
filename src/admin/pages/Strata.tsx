import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStrata } from "../../shared/hooks/useStrata";
import { useLookups } from "../../shared/hooks/useLookups";
import { useCompanies } from "../../shared/hooks/useCompanies";
import { useMediaQuery } from "../../shared/hooks/useMediaQuery";
import {
  DataTable,
  type Column,
} from "../../shared/components/DataTable";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
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
  const { legalTypes, propertyTypes, sections } = useLookups();
  const { companies } = useCompanies();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrata, setEditingStrata] = useState<Strata | null>(null);
  const [formData, setFormData] = useState<CreateStrataInput>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterStrataName, setFilterStrataName] = useState("");
  const [filterStrataPlan, setFilterStrataPlan] = useState("");
  const [filterPropertyTypeId, setFilterPropertyTypeId] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSectionIds, setFilterSectionIds] = useState<number[]>([]);

  const isDesktop = useMediaQuery("(min-width: 750px)");

  const cities = useMemo(
    () =>
      [...new Set(stratas.map((s) => s.town).filter(Boolean))].sort() as string[],
    [stratas]
  );

  const [filteredStratas, setFilteredStratas] = useState<Strata[]>([]);

  useEffect(() => {
    let result = stratas;

    if (filterStrataName) {
      result = result.filter((s) => s.strataId === parseInt(filterStrataName));
    }

    if (filterStrataPlan) {
      result = result.filter((s) => s.strataId === parseInt(filterStrataPlan));
    }

    if (filterPropertyTypeId) {
      result = result.filter(
        (s) => s.propertyTypeId === parseInt(filterPropertyTypeId)
      );
    }

    if (filterCity) {
      result = result.filter(
        (s) => (s.town || "").toLowerCase() === filterCity.toLowerCase()
      );
    }

    if (filterSectionIds.length > 0) {
      result = result.filter((s) =>
        s.strataSections?.some((ss) => filterSectionIds.includes(ss.sectionId))
      );
    }

    setFilteredStratas(result);
  }, [stratas, filterStrataName, filterStrataPlan, filterPropertyTypeId, filterCity, filterSectionIds]);

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
    setFormData({ country: "Canada", sectionIds: [] });
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
      sectionIds: strata.strataSections?.map(ss => ss.section.sectionId) || [],
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
            label="Property Type"
            value={filterPropertyTypeId}
            onChange={(val) => setFilterPropertyTypeId(val)}
            options={propertyTypes.map((pt) => ({
              value: pt.propertyTypeId,
              label: pt.propertyTypeName,
            }))}
            placeholder="All Types"
          />
          <SingleSelectDropdown
            label="City"
            value={filterCity}
            onChange={(val) => setFilterCity(val)}
            options={cities.map((c) => ({ value: c, label: c }))}
            placeholder="All Cities"
          />
          <MultiSelectDropdown
            label="Section"
            options={sections.map((s) => ({ value: s.sectionId, label: s.sectionName }))}
            selectedValues={filterSectionIds}
            onChange={setFilterSectionIds}
            placeholder="All Sections"
          />
        </div>
      </div>

      <div className="add-strata-button">
        <button className="btn-primary" onClick={openCreateModal}>
          + Create New Strata
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isDesktop ? (
        <DataTable
          columns={columns}
          data={filteredStratas}
          keyExtractor={(s) => s.strataId}
          loading={loading}
          emptyMessage="No strata properties found. Click 'Create New Strata' to create one."
          onRowClick={(strata) => navigate(`/admin/strata/${strata.strataId}`)}
          actions={(strata) => (
            <>
              <button
                className="btn-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(strata);
                }}
              >
                Edit
              </button>
            </>
          )}
        />
      ) : (
        <>
          {loading && <LoadingSpinner />}
          {!loading && filteredStratas.length === 0 && (
            <div className="data-table-empty">
              <p>No strata properties found. Click &apos;Create New Strata&apos; to create one.</p>
            </div>
          )}
          {!loading && filteredStratas.length > 0 && (
            <div className="data-table-container">
              <table className="data-table strata-table-mobile">
                <thead>
                  <tr>
                    <th colSpan={2} className="strata-mobile-title">
                      Stratas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStratas.map((strata) => (
                    <tr
                      key={strata.strataId}
                      onClick={() => navigate(`/admin/strata/${strata.strataId}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="strata-mobile-col-name">
                        {strata.complexName || strata.strataPlan || "-"}
                      </td>
                      <td className="strata-mobile-col-actions actions-cell">
                        <div className="strata-mobile-actions">
                          <button
                            className="btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(strata);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

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
            <InputField
              label="Province"
              value={formData.province || ""}
              onChange={(e) => updateField("province", e.target.value)}
              placeholder="e.g., BC"
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
            <SingleSelectDropdown
              label="Property Type"
              value={formData.propertyTypeId?.toString() || ""}
              onChange={(val) =>
                updateField(
                  "propertyTypeId",
                  val ? parseInt(val) : undefined,
                )
              }
              options={propertyTypes.map((pt) => ({
                value: pt.propertyTypeId,
                label: pt.propertyTypeName,
              }))}
              placeholder="Select property type"
              required
            />
          </FormRow>

          <MultiSelectDropdown
            label="Sections"
            options={sections.map(s => ({ value: s.sectionId, label: s.sectionName }))}
            selectedValues={formData.sectionIds || []}
            onChange={(values) => setFormData(prev => ({ ...prev, sectionIds: values }))}
            placeholder="Select sections"
            required
          />

          <SingleSelectDropdown
            label="Company"
            value={formData.companyId?.toString() || ""}
            onChange={(val) =>
              updateField(
                "companyId",
                val ? parseInt(val) : undefined,
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
