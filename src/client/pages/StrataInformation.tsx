import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner/LoadingSpinner';

interface StrataInfo {
  strataId: number;
  strataPlan: string | null;
  complexName: string | null;
  streetName: string | null;
  town: string | null;
  province: string | null;
  postalCode: string | null;
  legalType: { legalTypeName: string } | null;
  propertyType: { propertyTypeName: string } | null;
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
              street_name,
              town,
              province,
              postal_code,
              legal_type:legal_type_id (legal_type_name),
              property_type:property_type_id (property_type_name)
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
            street_name: string | null;
            town: string | null;
            province: string | null;
            postal_code: string | null;
            legal_type: { legal_type_name: string } | null;
            property_type: { property_type_name: string } | null;
          };

          setStrata({
            strataId: s.id,
            strataPlan: s.strata_plan,
            complexName: s.complex_name,
            streetName: s.street_name,
            town: s.town,
            province: s.province,
            postalCode: s.postal_code,
            legalType: s.legal_type ? { legalTypeName: s.legal_type.legal_type_name } : null,
            propertyType: s.property_type ? { propertyTypeName: s.property_type.property_type_name } : null,
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
        <h1>Property Profile</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!strata) {
    return (
      <div className="page-container">
        <h1>Property Profile</h1>
        <p>No strata information found for your account.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Property Profile</h1>
      <p className="strata-info__subtitle">Please verify your strata information</p>

      <div className="strata-info__card">
        <h2 className="strata-info__section-title">Basic Information</h2>

        <div className="strata-info__row strata-info__row--2col">
          <div className="strata-info__field">
            <span className="strata-info__label">Strata Plan</span>
            <span className="strata-info__value">{strata.strataPlan || 'N/A'}</span>
          </div>
          <div className="strata-info__field">
            <span className="strata-info__label">Complex Name</span>
            <span className="strata-info__value">{strata.complexName || 'N/A'}</span>
          </div>
        </div>

        <div className="strata-info__divider" />

        <div className="strata-info__row">
          <div className="strata-info__field">
            <span className="strata-info__label">Address</span>
            <span className="strata-info__value">{strata.streetName || 'N/A'}</span>
          </div>
        </div>

        <div className="strata-info__divider" />

        <div className="strata-info__row strata-info__row--3col">
          <div className="strata-info__field">
            <span className="strata-info__label">City</span>
            <span className="strata-info__value">{strata.town || 'N/A'}</span>
          </div>
          <div className="strata-info__field">
            <span className="strata-info__label">Province</span>
            <span className="strata-info__value">{strata.province || 'N/A'}</span>
          </div>
          <div className="strata-info__field">
            <span className="strata-info__label">Postal Code</span>
            <span className="strata-info__value">{strata.postalCode || 'N/A'}</span>
          </div>
        </div>

        <div className="strata-info__divider" />

        <h2 className="strata-info__section-title">Property Type</h2>

        <div className="strata-info__row strata-info__row--2col">
          <div className="strata-info__field">
            <span className="strata-info__label">Property Type</span>
            <span className="strata-info__value">{strata.propertyType?.propertyTypeName || 'N/A'}</span>
          </div>
          <div className="strata-info__field">
            <span className="strata-info__label">Legal Type</span>
            <span className="strata-info__value">{strata.legalType?.legalTypeName || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrataInformation;
