import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';

interface StrataInfo {
  strataId: number;
  strataPlan: string | null;
  complexName: string | null;
  unitNumber: string | null;
  streetName: string | null;
  town: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  legalType: { legalTypeName: string } | null;
  propertyType: { propertyTypeName: string } | null;
  company: { companyName: string; companyTelephone: string | null } | null;
}

const StrataInformation = () => {
  const { user } = useAuth();
  const [strata, setStrata] = useState<StrataInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrataInfo = async () => {
      if (!user || user.role !== 'client') return;

      try {
        const { data: strataProfile, error: profileError } = await supabase
          .from('strata_profiles')
          .select(`
            strata:strata_id (
              id:strata_id,
              strata_plan,
              complex_name,
              unit_number,
              street_name,
              town,
              province,
              postal_code,
              country,
              website,
              legal_type:legal_type_id (legal_type_name),
              property_type:property_type_id (property_type_name),
              company:company_id (company_name, company_telephone)
            )
          `)
          .eq('profile_id', user.id)
          .limit(1)
          .single();

        if (profileError) throw profileError;

        if (strataProfile?.strata) {
          const s = strataProfile.strata as unknown as {
            id: number;
            strata_plan: string | null;
            complex_name: string | null;
            unit_number: string | null;
            street_name: string | null;
            town: string | null;
            province: string | null;
            postal_code: string | null;
            country: string | null;
            website: string | null;
            legal_type: { legal_type_name: string } | null;
            property_type: { property_type_name: string } | null;
            company: { company_name: string; company_telephone: string | null } | null;
          };

          setStrata({
            strataId: s.id,
            strataPlan: s.strata_plan,
            complexName: s.complex_name,
            unitNumber: s.unit_number,
            streetName: s.street_name,
            town: s.town,
            province: s.province,
            postalCode: s.postal_code,
            country: s.country,
            website: s.website,
            legalType: s.legal_type ? { legalTypeName: s.legal_type.legal_type_name } : null,
            propertyType: s.property_type ? { propertyTypeName: s.property_type.property_type_name } : null,
            company: s.company ? { companyName: s.company.company_name, companyTelephone: s.company.company_telephone } : null,
          });
        }
      } catch (err) {
        console.error('Error fetching strata information:', err);
        setError('Failed to load strata information.');
      } finally {
        setLoading(false);
      }
    };

    fetchStrataInfo();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="page-container">
        <h1>Strata Information</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!strata) {
    return (
      <div className="page-container">
        <h1>Strata Information</h1>
        <p>No strata information found for your account.</p>
      </div>
    );
  }

  const address = [strata.unitNumber, strata.streetName, strata.town, strata.province, strata.postalCode, strata.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="page-container">
      <h1>Strata Information</h1>

      <div className="strata-info">
        <div className="strata-info__section">
          <h2>General</h2>
          <div className="strata-info__grid">
            <div className="strata-info__field">
              <span className="strata-info__label">Strata Plan</span>
              <span className="strata-info__value">{strata.strataPlan || 'N/A'}</span>
            </div>
            <div className="strata-info__field">
              <span className="strata-info__label">Complex Name</span>
              <span className="strata-info__value">{strata.complexName || 'N/A'}</span>
            </div>
            <div className="strata-info__field">
              <span className="strata-info__label">Legal Type</span>
              <span className="strata-info__value">{strata.legalType?.legalTypeName || 'N/A'}</span>
            </div>
            <div className="strata-info__field">
              <span className="strata-info__label">Property Type</span>
              <span className="strata-info__value">{strata.propertyType?.propertyTypeName || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="strata-info__section">
          <h2>Address</h2>
          <div className="strata-info__grid">
            <div className="strata-info__field strata-info__field--full">
              <span className="strata-info__label">Full Address</span>
              <span className="strata-info__value">{address || 'N/A'}</span>
            </div>
            {strata.website && (
              <div className="strata-info__field">
                <span className="strata-info__label">Website</span>
                <a href={strata.website} target="_blank" rel="noopener noreferrer" className="strata-info__value strata-info__link">
                  {strata.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {strata.company && (
          <div className="strata-info__section">
            <h2>Management Company</h2>
            <div className="strata-info__grid">
              <div className="strata-info__field">
                <span className="strata-info__label">Company Name</span>
                <span className="strata-info__value">{strata.company.companyName}</span>
              </div>
              {strata.company.companyTelephone && (
                <div className="strata-info__field">
                  <span className="strata-info__label">Phone</span>
                  <span className="strata-info__value">{strata.company.companyTelephone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrataInformation;
