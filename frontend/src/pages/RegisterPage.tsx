import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { ServiceCategory } from '../types/task';
import { UserType } from '../types/user';

/**
 * Registration page component
 */
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [userType, setUserType] = useState<'customer' | 'provider'>('customer');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    address: '',
    categoryId: '',
    latitude: '',
    longitude: '',
    businessName: '',
    bio: '',
    yearsOfExperience: '',
    serviceRadiusKm: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

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

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    setErrors({
      ...errors,
      [e.target.name]: '',
    });
    setApiError('');
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (userType === 'provider') {
      if (!formData.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required for providers';
      } else if (!/^[0-9]{10,15}$/.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Phone number must be 10-15 digits';
      }

      if (!formData.address) {
        newErrors.address = 'Address is required for providers';
      }

      if (!formData.categoryId) {
        newErrors.categoryId = 'Service category is required for providers';
      }

      if (!formData.latitude) {
        newErrors.latitude = 'Latitude is required for providers';
      }

      if (!formData.longitude) {
        newErrors.longitude = 'Longitude is required for providers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      let response;
      if (userType === 'customer') {
        response = await authService.registerCustomer({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber || undefined,
          address: formData.address || undefined,
        });
      } else {
        response = await authService.registerProvider({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          categoryId: parseInt(formData.categoryId),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        });
      }

      // Store auth data in context (which also saves to localStorage)
      setUser(response);

      // Redirect based on user type - Fixed: Use CUSTOMER instead of customer
      if (response.userType === UserType.CUSTOMER) {
        navigate('/customer/dashboard');
      } else if (response.userType === UserType.SERVICE_PROVIDER) {
        navigate('/provider/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setApiError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
      <div className="card">
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

        {success && (
          <div style={{
            padding: '2rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            textAlign: 'center',
            marginBottom: '2rem'
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
                After verification, you can return here to log in.
              </p>
            </div>
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#e7f3ff',
              borderRadius: '8px',
              border: '1px solid #b3d9ff'
            }}>
              <p style={{ color: '#004085', margin: '0', fontSize: '0.9rem' }}>
                💡 <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
              </p>
            </div>
            <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              Already verified your email?
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Go to Login
            </Link>
          </div>
        )}

        {apiError && <div className="error-message">{apiError}</div>}

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
            {errors.email && <span className="error-text">{errors.email}</span>}
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
            {errors.password && <span className="error-text">{errors.password}</span>}
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
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
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
            {errors.firstName && <span className="error-text">{errors.firstName}</span>}
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
            {errors.lastName && <span className="error-text">{errors.lastName}</span>}
          </div>

          <div className="form-group">
            <label>Phone Number {userType === 'provider' && '*'}</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required={userType === 'provider'}
            />
            {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
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
                <label>Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-group">
                <label>Service Category *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <span className="error-text">{errors.categoryId}</span>}
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
                <label>Latitude *</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 7.2083"
                />
                {errors.latitude && <span className="error-text">{errors.latitude}</span>}
              </div>

              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 79.8458"
                />
                {errors.longitude && <span className="error-text">{errors.longitude}</span>}
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