import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types/notification';

const ProviderNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDecline = async (notification: Notification) => {
    if (!window.confirm('Are you sure you want to decline this task?')) return;

    try {
      await notificationService.declineTask(notification.id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to decline task', err);
      alert('Failed to decline task');
    }
  };

  const handleSubmitQuote = (notification: Notification) => {
    navigate(`/provider/tasks/${notification.id}`, { state: { notification } });
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
          You have {unviewedCount} new task{unviewedCount !== 1 ? 's' : ''}
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
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="card notification-card"
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
                  <p><strong>Budget:</strong> LKR {notification.budgetMin} - LKR {notification.budgetMax}</p>
                  <p><strong>Description:</strong> {notification.taskDescription}</p>
                  <p><strong>Received:</strong> {new Date(notification.createdAt).toLocaleString()}</p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {notification.hasQuotation && (
                      <span className="badge badge-success">QUOTATION SUBMITTED</span>
                    )}
                    {notification.isDeclined && (
                      <span className="badge badge-danger">DECLINED</span>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notification.hasQuotation ? (
                    <button className="btn btn-secondary" disabled>
                      Already Quoted
                    </button>
                  ) : notification.isDeclined ? (
                    <button className="btn btn-secondary" disabled>
                      Declined
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSubmitQuote(notification)}
                      >
                        Submit Quote
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDecline(notification)}
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
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
