import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const verifyEmail = async () => {
      if (!token) {
        if (isMounted) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
        }
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        if (isMounted) {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully!');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err: any) {
        if (isMounted) {
          const errorMessage = err.response?.data?.message || '';

          // If email was already verified, treat it as success
          if (errorMessage.includes('already been verified')) {
            setStatus('success');
            setMessage('Your email has been verified! You can now log in.');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(
              errorMessage ||
              'Failed to verify email. The link may have expired or is invalid.'
            );
          }
        }
      }
    };

    verifyEmail();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        {status === 'verifying' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 2rem' }}></div>
            <h2>Verifying Your Email...</h2>
            <p>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '4rem', color: '#27ae60', marginBottom: '1rem' }}>
              ✓
            </div>
            <h2 style={{ color: '#27ae60' }}>Email Verified!</h2>
            <p style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{message}</p>
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#d4edda',
              borderRadius: '8px',
              border: '1px solid #c3e6cb'
            }}>
              <p style={{ margin: 0, color: '#155724' }}>
                You can now log in to your account and start using the platform.
              </p>
            </div>
            <p style={{ marginTop: '2rem', color: '#7f8c8d' }}>
              Redirecting to login page in 3 seconds...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '4rem', color: '#e74c3c', marginBottom: '1rem' }}>
              ✗
            </div>
            <h2 style={{ color: '#e74c3c' }}>Verification Failed</h2>
            <p>{message}</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-secondary">
                Register Again
              </Link>
              <Link to="/login" className="btn btn-primary">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>

      <style>{`
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmailPage;
