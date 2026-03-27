import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { Task, TaskStatus } from '../../types/task';
import { Quotation, ServiceProvider } from '../../types/quotation';
import TaskMap from '../../components/TaskMap';

const TaskDetailsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  // const [review, setReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      const [taskData] = await Promise.all([
        taskService.getTaskById(Number(taskId!)),
      ]);
      setTask(taskData);
    } catch (err) {
      console.error('Failed to load task details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (quotationId: number) => {
    try {
      // await quotationService.acceptQuotation(quotationId);
      setMessage('Quotation accepted successfully!');
      loadTaskDetails();
    } catch (err) {
      setMessage('Failed to accept quotation');
    }
  };

  const handleReject = async (quotationId: number) => {
    try {
      // await quotationService.rejectQuotation(quotationId);
      setMessage('Quotation rejected');
      loadTaskDetails();
    } catch (err) {
      setMessage('Failed to reject quotation');
    }
  };

  const handleDeleteTask = async () => {
    setDeleting(true);
    setError('');

    try {
      await taskService.deleteTask(Number(taskId!));
      setMessage('Task deleted successfully!');
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="container loading">Loading...</div>;
  }

  if (!task) {
    return <div className="container">Task not found</div>;
  }

  return (
    <div className="container">
      <h1>{task.title}</h1>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <h2>Task Details</h2>
        <p><strong>Description:</strong> {task.description}</p>
        <p><strong>Category:</strong> {task.categoryName}</p>
        <p><strong>Location:</strong> {task.address}</p>
        <p><strong>Status:</strong> <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span></p>
        {task.budgetMin && task.budgetMax && (
          <p><strong>Budget:</strong> ${task.budgetMin} - ${task.budgetMax}</p>
        )}
        {task.preferredDate && (
          <p><strong>Preferred Date:</strong> {task.preferredDate}</p>
        )}

        {task.status === TaskStatus.IN_PROGRESS && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
            <p style={{ color: '#856404', marginBottom: '1rem' }}>
              🔧 <strong>Work in Progress</strong> - The service provider is working on this task.
            </p>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure the work has been completed? This will mark the task as finished.')) {
                  try {
                    await taskService.updateTaskStatus(task.id, TaskStatus.COMPLETED);
                    setMessage('Task marked as completed! You can now leave a review.');
                    loadTaskDetails();
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to update task status');
                  }
                }
              }}
              className="btn btn-success"
              style={{ width: '100%' }}
            >
              Mark as Completed
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#856404', textAlign: 'center' }}>
              Click this button when the service provider has finished the work
            </p>
          </div>
        )}

        {task.status === TaskStatus.COMPLETED && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px' }}>
            <p style={{ color: '#155724', marginBottom: '0' }}>
              ✓ <strong>Task Completed!</strong> The service has been completed.
            </p>
          </div>
        )}

        {/* Delete Task Button */}
        {task.status !== TaskStatus.IN_PROGRESS && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-danger"
              style={{ width: '100%' }}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
              {task.status === TaskStatus.OPEN
                ? 'You can delete this task since it hasn\'t been accepted yet'
                : task.status === TaskStatus.COMPLETED
                ? 'Delete this completed task from your history'
                : 'You can delete this cancelled task'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ marginTop: 0, color: '#dc3545' }}>Delete Task?</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete this task? This action cannot be undone.
              {/* {quotations.length > 0 && (
                <span style={{ display: 'block', marginTop: '0.5rem', color: '#dc3545', fontWeight: 'bold' }}>
                  Warning: This task has {quotations.length} quotation{quotations.length > 1 ? 's' : ''} that will also be deleted.
                </span>
              )} */}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleDeleteTask}
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Location Map */}
      <div className="card">
        <h2>Location & Nearby Providers</h2>
        <TaskMap task={task} providers={providers} />
      </div>

      <div className="card">
        <h2>Quotations ({quotations.length})</h2>

        {quotations.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>No quotations received yet.</p>
        ) : (
          quotations.map((quotation) => (
            <div key={quotation.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h3>{quotation.providerName}</h3>
              {quotation.providerBusinessName && <p><strong>Business:</strong> {quotation.providerBusinessName}</p>}
              <p><strong>Price:</strong> ${quotation.price}</p>
              {quotation.estimatedDuration && <p><strong>Duration:</strong> {quotation.estimatedDuration}</p>}
              {quotation.message && <p><strong>Message:</strong> {quotation.message}</p>}
              <p><strong>Rating:</strong> ⭐ {quotation.providerRating} ({quotation.providerTotalReviews} reviews)</p>
              <p><strong>Status:</strong> <span className={`badge badge-${quotation.status.toLowerCase()}`}>{quotation.status}</span></p>

              {quotation.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => handleAccept(quotation.id)} className="btn btn-success">
                    Accept
                  </button>
                  <button onClick={() => handleReject(quotation.id)} className="btn btn-danger">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      }
    </div>
  );
};

export default TaskDetailsPage;
