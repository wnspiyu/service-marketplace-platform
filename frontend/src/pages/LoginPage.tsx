import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserType } from '../types/user';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as any)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirect based on user type
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.userType === UserType.CUSTOMER) {
        navigate('/customer/dashboard');
      } else if (userData.userType === UserType.SERVICE_PROVIDER) {
        navigate('/provider/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
          Login to Service Marketplace
        </h2>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        {error && (
          <div className={error.toLowerCase().includes('email not verified') || error.toLowerCase().includes('verify') ? 'warning-message' : 'error-message'}>
            {error}
            {(error.toLowerCase().includes('email not verified') || error.toLowerCase().includes('verify')) && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                <Link to="/register" style={{ color: '#856404', textDecoration: 'underline' }}>
                  Didn't receive the email? Register again
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <Link to="/forgot-password" style={{ color: '#3498db', fontSize: '0.9rem' }}>
              Forgot password?
            </Link>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#7f8c8d' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#3498db', textDecoration: 'none' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
