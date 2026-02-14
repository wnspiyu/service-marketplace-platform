import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Provider dashboard page (temporary)
 */
const ProviderDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Service Marketplace</h2>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome, {user?.firstName}!</h1>
          <p className="user-type-badge provider">Service Provider</p>
          <p className="user-email">{user?.email}</p>



          <div className="dashboard-info">
            <h3>Provider Dashboard</h3>
            <p>This is a temporary dashboard. Features coming soon:</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;