import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quotationService } from '../../services/quotationService';
import { notificationService } from '../../services/notificationService';
import { Quotation } from '../../types/quotation';

const ProviderDashboard: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotationsData, count] = await Promise.all([
        quotationService.getMyQuotations(),
        notificationService.getUnviewedCount(),
      ]);
      setQuotations(quotationsData);
      setUnviewedCount(count);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container loading">Loading...</div>;
  }

  const pendingQuotations = quotations.filter(q => q.status === 'PENDING').length;
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED').length;

  return (
    <div className="container">
      <h1>Provider Dashboard</h1>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <Link to="/provider/notifications" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
            <h3 style={{ color: '#3498db', fontSize: '2rem' }}>{unviewedCount}</h3>
            <p>New Notifications</p>
            <p style={{ color: '#3498db', fontSize: '0.9rem', marginTop: '0.5rem' }}>Click to view →</p>
          </div>
        </Link>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#f39c12', fontSize: '2rem' }}>{pendingQuotations}</h3>
          <p>Pending Quotations</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#27ae60', fontSize: '2rem' }}>{acceptedQuotations}</h3>
          <p>Accepted Quotations</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Quotations</h2>
        {quotations.slice(0, 5).map((quotation) => (
          <div key={quotation.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
            <h4>{quotation.taskTitle}</h4>
            <p>Price: ${quotation.price} | Status: <span className={`badge badge-${quotation.status.toLowerCase()}`}>{quotation.status}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderDashboard;
