import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { quotationService } from '../../services/quotationService';
import { Notification } from '../../types/notification';
import { CreateQuotationRequest } from '../../types/quotation';

const ProviderTaskDetail: React.FC = () => {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [notification, setNotification] = useState<Notification | null>(
    (location.state as any)?.notification ?? null
  );
  const [loading, setLoading] = useState(!notification);
  const [quoteForm, setQuoteForm] = useState({ price: '', estimatedDuration: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!notification && notificationId) {
      loadNotification();
    } else if (notification && !notification.isViewed) {
      notificationService.markAsViewed(notification.id).catch(() => {});
    }
  }, []);

  const loadNotification = async () => {
    try {
      const all = await notificationService.getNotifications();
      const found = all.find(n => n.id === Number(notificationId));
      if (!found) {
        navigate('/provider/notifications');
        return;
      }
      if (!found.isViewed) {
        await notificationService.markAsViewed(found.id);
      }
      setNotification({ ...found, isViewed: true });
    } catch (err) {
      console.error('Failed to load task', err);
      navigate('/provider/notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notification) return;

    setSubmitting(true);
    setError('');
    try {
      const request: CreateQuotationRequest = {
        taskId: notification.taskId,
        price: parseFloat(quoteForm.price),
        estimatedDuration: quoteForm.estimatedDuration,
        message: quoteForm.message,
      };
      await quotationService.submitQuotation(request);
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!notification) return;

    try {
      await notificationService.declineTask(notification.id);
      navigate(-1);
    } catch (err) {
      setError('Failed to decline task');
    }
  };

  if (loading) return <div className="container loading">Loading...</div>;
  if (!notification) return null;

  return (
    <div className="container">
      <h1>{notification.taskTitle}</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <h2>Task Details</h2>
        <p><strong>Category:</strong> {notification.categoryName}</p>
        <p><strong>Customer:</strong> {notification.customerName}</p>
        <p><strong>Location:</strong> {notification.taskAddress}</p>
        <p><strong>Distance:</strong> {notification.distanceKm.toFixed(2)} km away</p>
        {(notification.budgetMin || notification.budgetMax) && (
          <p><strong>Budget:</strong> LKR {notification.budgetMin} – LKR {notification.budgetMax}</p>
        )}
        {notification.preferredDate && (
          <p><strong>Preferred Date:</strong> {notification.preferredDate}</p>
        )}
        <p><strong>Description:</strong> {notification.taskDescription}</p>
      </div>

      {notification.hasQuotation ? (
        <div className="card" style={{ backgroundColor: '#d4edda', color: '#155724' }}>
          <p>✓ You have already submitted a quotation for this task.</p>
        </div>
      ) : notification.isDeclined ? (
        <div className="card" style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
          <p>You have declined this task.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Submit Quotation</h2>
          <form onSubmit={handleSubmitQuote}>
            <div className="form-group">
              <label htmlFor="price">Your Price (LKR) *</label>
              <input
                type="number"
                id="price"
                value={quoteForm.price}
                onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                required
                min="0"
                step="0.01"
                placeholder="Enter your quoted price"
              />
            </div>

            <div className="form-group">
              <label htmlFor="estimatedDuration">Estimated Duration (days) *</label>
              <input
                type="number"
                id="estimatedDuration"
                value={quoteForm.estimatedDuration}
                onChange={(e) => setQuoteForm({ ...quoteForm, estimatedDuration: e.target.value })}
                required
                min="1"
                placeholder="Number of days to complete"
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Additional Message</label>
              <textarea
                id="message"
                value={quoteForm.message}
                onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                rows={4}
                placeholder="Provide additional details about your quotation..."
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit Quotation'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDecline}
                disabled={submitting}
              >
                Decline Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProviderTaskDetail;
