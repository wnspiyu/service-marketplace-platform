import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { Task, TaskStatus } from '../../types/task';

const CustomerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await taskService.getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    setError('');

    try {
      await taskService.deleteTask(taskId);
      setMessage('Task deleted successfully!');
      setDeleteConfirmId(null);
      // Reload tasks
      loadTasks();
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task. Please try again.');
      setDeleteConfirmId(null);
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (loading) {
    return <div className="container loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Tasks</h1>
        <Link to="/customer/create-task" className="btn btn-primary">
          Create New Task
        </Link>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
            You haven't created any tasks yet.
          </p>
          <Link to="/customer/create-task" className="btn btn-primary">
            Create Your First Task
          </Link>
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
              style={{
                borderLeft: task.status === TaskStatus.COMPLETED ? '4px solid #4caf50' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.description.substring(0, 150)}...</p>
                  <p><strong>Category:</strong> {task.categoryName}</p>
                  <p><strong>Location:</strong> {task.address}</p>
                  <p><strong>Quotations Received:</strong> {task.quotationCount}</p>
                  {task.status === TaskStatus.COMPLETED && (
                    <p style={{ color: '#4caf50', fontWeight: 'bold', marginTop: '0.5rem' }}>
                      ✓ Task completed successfully
                    </p>
                  )}
                </div>
                <div>
                  <span className={`badge badge-${task.status.toLowerCase().replace('_', '-')}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Link to={`/customer/tasks/${task.id}`} className="btn btn-primary">
                  View Details
                </Link>
                {task.status !== TaskStatus.IN_PROGRESS && (
                  <button
                    onClick={() => setDeleteConfirmId(task.id)}
                    className="btn btn-danger"
                    disabled={deletingTaskId === task.id}
                  >
                    {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
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
              Are you sure you want to delete this task? This action cannot be undone and will also delete all associated quotations.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => handleDeleteTask(deleteConfirmId)}
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={deletingTaskId === deleteConfirmId}
              >
                {deletingTaskId === deleteConfirmId ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={deletingTaskId === deleteConfirmId}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
