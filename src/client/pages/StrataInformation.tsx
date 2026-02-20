import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { supabase } from '../../shared/lib/supabaseClient';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { StrataInfo } from '../../shared/types/entities.types';

const StrataInformation = () => {
  const { user } = useAuth();
  const [strata, setStrata] = useState<StrataInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrataInfo = async () => {
      if (!user || user.role !== 'client') return;

      try {
        const { data, error } = await supabase
          .from('strata_profiles')
          .select(`
            strata:strata_id (
              strataId:strata_id,
              strataPlan:strata_plan,
              complexName:complex_name,
              streetName:street_name,
              town,
              province,
              postalCode:postal_code,
              legalType:legal_type_id (
                legalTypeId:legal_type_id,
                legalTypeName:legal_type_name
              ),
              propertyType:property_type_id (
                propertyTypeId:property_type_id,
                propertyTypeName:property_type_name
              )
            )
          `)
          .eq('profile_id', user.id)
          .single();

        if (error) throw error;

        if (data?.strata) {
          setStrata(data.strata as unknown as StrataInfo);
          // had to cast to unknown first because of the nested select structure, but it should match our StrataInfo type
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
      <p className="page-subtitle">Please verify your strata information</p>

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
            <span className="strata-info__value">
              {strata.propertyType?.propertyTypeName || 'N/A'}
            </span>
          </div>
          <div className="strata-info__field">
            <span className="strata-info__label">Legal Type</span>
            <span className="strata-info__value">
              {strata.legalType?.legalTypeName || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrataInformation;
