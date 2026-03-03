import { Link } from 'react-router-dom';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';

export const Dashboard = () => {
  const { activeRequest } = useClientServiceRequest();

  return (
    <div className="page-container">
      <h1>Client Dashboard</h1>
      <p className="page-subtitle">Welcome to the Strata Reserve Planning (SRP) Client Portal.</p>

      {activeRequest?.rebookingRequestedAt && (
        <div className="inspection-date__card inspection-date__card--info mt-lg">
          <h3>Please Rebook Your Inspection</h3>
          <p>Your previous appointment was cancelled. Please select a new date for your inspection.</p>
          <div className="mt-md">
            <Link to="/client/inspection-date" className="btn btn-primary">
              Book Inspection Date
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
