import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { ServiceCategory } from '../types/task';
import LocationPicker from '../components/LocationPicker';

const RegisterPage: React.FC = () => {
  const [userType, setUserType] = useState<'customer' | 'provider'>('customer');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    // Provider specific
    categoryId: '',
    businessName: '',
    bio: '',
    yearsOfExperience: 0,
    latitude: 0,
    longitude: 0,
    serviceRadiusKm: 0,
  });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userType === 'provider') {
      loadCategories();
    }
  }, [userType]);

  const loadCategories = async () => {
    try {
      const data = await taskService.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (latitude: number, longitude: number, address: string) => {
    setFormData({
      ...formData,
      latitude,
      longitude,
      address,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (userType === 'customer') {
        response = await authService.registerCustomer({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
        });
      } else {
        response = await authService.registerProvider({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          categoryId: Number(formData.categoryId),
          businessName: formData.businessName,
          bio: formData.bio,
          yearsOfExperience: Number(formData.yearsOfExperience),
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          address: formData.address,
          serviceRadiusKm: Number(formData.serviceRadiusKm),
        });
      }

      // Don't auto-login - user needs to verify email first
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
      <div className="card">
        {!success && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
              Create Account
            </h2>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button
                type="button"
                className={`btn ${userType === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setUserType('customer')}
              >
                Register as Customer
              </button>
              <button
                type="button"
                className={`btn ${userType === 'provider' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setUserType('provider')}
              >
                Register as Provider
              </button>
            </div>
          </>
        )}

        {success && (
          <div style={{
            padding: '2rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', color: '#28a745', marginBottom: '1rem' }}>✓</div>
            <h3 style={{ color: '#155724', marginBottom: '1rem' }}>Registration Successful!</h3>
            <p style={{ color: '#155724', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
              We've sent a verification email to <strong>{formData.email}</strong>
            </p>
            <div style={{
              margin: '1.5rem 0',
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px'
            }}>
              <p style={{ color: '#856404', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                📧 Important: Verify your email before logging in
              </p>
              <p style={{ color: '#856404', margin: '0', fontSize: '0.95rem' }}>
                Please check your email inbox and click the verification link to activate your account.
              </p>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {!success && <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>

          {userType === 'customer' && (
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          )}

          {userType === 'provider' && (
            <>
              <div className="form-group">
                <label>Service Category *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell customers about your experience and services..."
                />
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Service Location *</label>
                <LocationPicker
                  initialLatitude={formData.latitude}
                  initialLongitude={formData.longitude}
                  initialAddress={formData.address}
                  radiusKm={formData.serviceRadiusKm}
                  onLocationChange={handleLocationChange}
                />
              </div>

              <div className="form-group">
                <label>Service Radius (km)</label>
                <input
                  type="number"
                  name="serviceRadiusKm"
                  value={formData.serviceRadiusKm}
                  onChange={handleChange}
                  min="1"
                  max="200"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>}

        {!success && <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#7f8c8d' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3498db', textDecoration: 'none' }}>
              Login here
            </Link>
          </p>
        </div>}
      </div>
    </div>
  );
};

export default RegisterPage;
