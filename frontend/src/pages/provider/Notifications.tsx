import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { quotationService } from '../../services/quotationService';
import { Notification } from '../../types/notification';
import { CreateQuotationRequest } from '../../types/quotation';

const ProviderNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    price: '',
    estimatedDuration: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewNotification = async (notification: Notification) => {
    try {
      if (!notification.isViewed) {
        await notificationService.markAsViewed(notification.id);
        // Update local state
        setNotifications(
          notifications.map((n) =>
            n.id === notification.id ? { ...n, isViewed: true } : n
          )
        );
      }
      setSelectedNotification(notification);
      setShowQuoteModal(true);
    } catch (err) {
      console.error('Failed to mark notification as viewed', err);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotification) return;

    setSubmitting(true);
    try {
      const request: CreateQuotationRequest = {
        taskId: selectedNotification.taskId,
        price: parseFloat(quoteForm.price),
        estimatedDuration: quoteForm.estimatedDuration,
        message: quoteForm.message,
      };

      await quotationService.submitQuotation(request);
      alert('Quotation submitted successfully!');

      // Reset form and close modal
      setQuoteForm({ price: '', estimatedDuration: '', message: '' });
      setShowQuoteModal(false);
      setSelectedNotification(null);

      // Reload notifications
      loadNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedNotification) return;

    if (!window.confirm('Are you sure you want to decline this task?')) {
      return;
    }

    try {
      await notificationService.declineTask(selectedNotification.id);
      alert('Task declined');
      setShowQuoteModal(false);
      setSelectedNotification(null);
      loadNotifications();
    } catch (err) {
      console.error('Failed to decline task', err);
      alert('Failed to decline task');
    }
  };

  const handleCloseModal = () => {
    setShowQuoteModal(false);
    setSelectedNotification(null);
    setQuoteForm({ price: '', estimatedDuration: '', message: '' });
  };

  if (loading) {
    return <div className="container loading">Loading notifications...</div>;
  }

  const unviewedCount = notifications.filter(n => !n.isViewed).length;

  return (
    <div className="container">
      <h1>Task Notifications</h1>

      {unviewedCount > 0 && (
        <div className="alert alert-info">
          You have {unviewedCount} new notification{unviewedCount !== 1 ? 's' : ''}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#7f8c8d', marginBottom: '0.5rem' }}>
            No open tasks available at the moment.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#95a5a6' }}>
            You'll be notified when customers post new tasks in your service area.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#95a5a6', marginTop: '1rem', fontStyle: 'italic' }}>
            Note: Only open tasks are shown here. Tasks that are already assigned or completed are not displayed.
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card notification-card ${!notification.isViewed ? 'unviewed' : ''}`}
              style={{
                borderLeft: !notification.isViewed ? '4px solid #3498db' : 'none',
                backgroundColor: !notification.isViewed ? '#f0f8ff' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{notification.taskTitle}</h3>
                  <p><strong>Category:</strong> {notification.categoryName}</p>
                  <p><strong>Location:</strong> {notification.taskAddress}</p>
                  <p><strong>Distance:</strong> {notification.distanceKm.toFixed(2)} km away</p>
                  <p><strong>Budget:</strong> ${notification.budgetMin} - ${notification.budgetMax}</p>
                  <p><strong>Description:</strong> {notification.taskDescription}</p>
                  <p><strong>Received:</strong> {new Date(notification.createdAt).toLocaleString()}</p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!notification.isViewed && (
                      <span className="badge badge-primary">NEW</span>
                    )}
                    {notification.hasQuotation && (
                      <span className="badge badge-success">QUOTATION SUBMITTED</span>
                    )}
                    {notification.isDeclined && (
                      <span className="badge badge-danger">DECLINED</span>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                  {notification.hasQuotation ? (
                    <button
                      className="btn btn-secondary"
                      disabled
                      style={{ marginBottom: '0.5rem' }}
                    >
                      Already Quoted
                    </button>
                  ) : notification.isDeclined ? (
                    <button
                      className="btn btn-secondary"
                      disabled
                      style={{ marginBottom: '0.5rem' }}
                    >
                      Declined
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleViewNotification(notification)}
                      style={{ marginBottom: '0.5rem' }}
                    >
                      Submit Quote
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote Submission Modal */}
      {showQuoteModal && selectedNotification && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Quotation</h2>
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <h3>{selectedNotification.taskTitle}</h3>
              <p><strong>Category:</strong> {selectedNotification.categoryName}</p>
              <p><strong>Customer:</strong> {selectedNotification.customerName}</p>
              <p><strong>Location:</strong> {selectedNotification.taskAddress}</p>
              <p><strong>Distance:</strong> {selectedNotification.distanceKm.toFixed(2)} km away</p>
              <p><strong>Budget Range:</strong> ${selectedNotification.budgetMin} - ${selectedNotification.budgetMax}</p>
              <p><strong>Description:</strong> {selectedNotification.taskDescription}</p>
            </div>

            {selectedNotification.hasQuotation ? (
              <div style={{ padding: '1.5rem', backgroundColor: '#d4edda', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ color: '#155724', fontSize: '1.1rem', marginBottom: '1rem' }}>
                  ✓ You have already submitted a quotation for this task
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuote}>
              <div className="form-group">
                <label htmlFor="price">Your Price ($) *</label>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-card {
          transition: transform 0.2s;
        }

        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .alert {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .alert-info {
          background-color: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
        }
      `}</style>
    </div>
  );
};

export default ProviderNotifications;
