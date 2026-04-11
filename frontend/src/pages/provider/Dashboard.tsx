import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationService } from '../../services/quotationService';
import { reviewService } from '../../services/reviewService';
import { notificationService } from '../../services/notificationService';
import { Quotation, Review } from '../../types/quotation';
import { Notification } from '../../types/notification';

type ActiveTab = 'new-notifications' | 'pending-quotations' | 'accepted-quotations' | 'total-reviews' | null;

const ProviderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotationsData, reviewsData, notificationsData] = await Promise.all([
        quotationService.getMyQuotations(),
        reviewService.getMyReviews(),
        notificationService.getNotifications(),
      ]);
      setQuotations(quotationsData);
      setReviews(reviewsData);
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container loading">Loading...</div>;
  }

  const newTasks = notifications.filter(n => !n.hasQuotation && !n.isDeclined && n.taskStatus === 'OPEN');
  const pendingQuotations = quotations.filter(q => q.status === 'PENDING');
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED');

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(prev => (prev === tab ? null : tab));
  };

  const cardStyle = (tab: ActiveTab): React.CSSProperties => ({
    textAlign: 'center',
    cursor: 'pointer',
    border: activeTab === tab ? '2px solid #3498db' : '2px solid transparent',
    transition: 'border 0.2s',
  });

  return (
    <div className="container">
      <h1>Provider Dashboard</h1>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="card" style={cardStyle('new-notifications')} onClick={() => handleTabClick('new-notifications')}>
          <h3 style={{ color: '#3498db', fontSize: '2rem' }}>{newTasks.length}</h3>
          <p>New Tasks</p>
        </div>

        <div className="card" style={cardStyle('pending-quotations')} onClick={() => handleTabClick('pending-quotations')}>
          <h3 style={{ color: '#f39c12', fontSize: '2rem' }}>{pendingQuotations.length}</h3>
          <p>Pending Quotations</p>
        </div>

        <div className="card" style={cardStyle('accepted-quotations')} onClick={() => handleTabClick('accepted-quotations')}>
          <h3 style={{ color: '#27ae60', fontSize: '2rem' }}>{acceptedQuotations.length}</h3>
          <p>Accepted Quotations</p>
        </div>

        <div className="card" style={cardStyle('total-reviews')} onClick={() => handleTabClick('total-reviews')}>
          <h3 style={{ color: '#e74c3c', fontSize: '2rem' }}>{reviews.length}</h3>
          <p>Total Reviews</p>
        </div>
      </div>

      {/* Detail panels */}
      {activeTab === 'new-notifications' && (
        <div className="card">
          <h2>New Tasks</h2>
          {newTasks.length === 0 ? (
            <p style={{ color: '#888' }}>No new tasks available.</p>
          ) : (
            newTasks.map((n) => (
              <div
                key={n.id}
                style={{ borderBottom: '1px solid #eee', padding: '1rem 0', cursor: 'pointer' }}
                onClick={() => navigate(`/provider/tasks/${n.id}`, { state: { notification: n } })}
              >
                <h4>{n.taskTitle}</h4>
                <p style={{ margin: 0 }}>{n.categoryName} &mdash; {n.taskAddress}</p>
                {(n.budgetMin || n.budgetMax) && (
                  <p style={{ margin: '0.25rem 0' }}>
                    Budget: LKR {n.budgetMin ?? '?'} – LKR {n.budgetMax ?? '?'}
                  </p>
                )}
                {n.preferredDate && (
                  <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                    Preferred date: {n.preferredDate}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pending-quotations' && (
        <div className="card">
          <h2>Pending Quotations</h2>
          {pendingQuotations.length === 0 ? (
            <p style={{ color: '#888' }}>No pending quotations.</p>
          ) : (
            pendingQuotations.map((q) => (
              <div key={q.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                <h4>{q.taskTitle}</h4>
                <p>Price: LKR {q.price} | Status: <span className="badge badge-pending">{q.status}</span></p>
                {q.estimatedDuration && <p style={{ margin: 0, color: '#888' }}>Est. duration: {q.estimatedDuration}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'accepted-quotations' && (
        <div className="card">
          <h2>Accepted Quotations</h2>
          {acceptedQuotations.length === 0 ? (
            <p style={{ color: '#888' }}>No accepted quotations.</p>
          ) : (
            acceptedQuotations.map((q) => (
              <div key={q.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                <h4>{q.taskTitle}</h4>
                <p>Price: LKR {q.price} | Status: <span className="badge badge-accepted">{q.status}</span></p>
                {q.estimatedDuration && <p style={{ margin: 0, color: '#888' }}>Est. duration: {q.estimatedDuration}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'total-reviews' && (
        <div className="card">
          <h2>All Reviews</h2>
          {reviews.length === 0 ? (
            <p style={{ color: '#888' }}>No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                <p><strong>{review.customerName}</strong> &mdash; ⭐ {review.rating}/5</p>
                {review.comment && <p style={{ margin: 0 }}>{review.comment}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Recent summaries — shown only when no tab is active */}
      {activeTab === null && (
        <>
          <div className="card">
            <h2>Recent Quotations</h2>
            {quotations.length === 0 ? (
              <p style={{ color: '#888' }}>No quotations yet.</p>
            ) : (
              quotations.slice(0, 2).map((quotation) => (
                <div key={quotation.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                  <h4>{quotation.taskTitle}</h4>
                  <p>Price: LKR {quotation.price} | Status: <span className={`badge badge-${quotation.status.toLowerCase()}`}>{quotation.status}</span></p>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h2>Recent Reviews</h2>
            {reviews.length === 0 ? (
              <p style={{ color: '#888' }}>No reviews yet.</p>
            ) : (
              reviews.slice(0, 2).map((review) => (
                <div key={review.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                  <p><strong>{review.customerName}</strong> - ⭐ {review.rating}/5</p>
                  <p>{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProviderDashboard;
