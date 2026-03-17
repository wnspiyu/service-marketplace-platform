import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { ServiceCategory } from '../../types/task';
import LocationPicker from '../../components/LocationPicker';

const CreateTaskPage: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    latitude: 40.7128,
    longitude: -74.0060,
    address: '',
    searchRadiusKm: 20,
    budgetMin: '',
    budgetMax: '',
    preferredDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

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
    setLoading(true);

    try {
      await taskService.createTask({
        title: formData.title,
        description: formData.description,
        categoryId: Number(formData.categoryId),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        address: formData.address,
        searchRadiusKm: Number(formData.searchRadiusKm),
        budgetMin: formData.budgetMin ? Number(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? Number(formData.budgetMax) : undefined,
        preferredDate: formData.preferredDate || undefined,
      });

      navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create New Task</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Paint 3 bedroom house"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Provide detailed description of what you need..."
            />
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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Task Location *</label>
            <LocationPicker
              initialLatitude={formData.latitude}
              initialLongitude={formData.longitude}
              initialAddress={formData.address}
              radiusKm={formData.searchRadiusKm}
              onLocationChange={handleLocationChange}
            />
          </div>

          <div className="form-group">
            <label>Search Radius (km) *</label>
            <input
              type="number"
              name="searchRadiusKm"
              value={formData.searchRadiusKm}
              onChange={handleChange}
              min="1"
              max="200"
              required
            />
          </div>

          <div className="form-group">
            <label>Budget Min (USD)</label>
            <input
              type="number"
              name="budgetMin"
              value={formData.budgetMin}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Budget Max (USD)</label>
            <input
              type="number"
              name="budgetMax"
              value={formData.budgetMax}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Preferred Date</label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating Task...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskPage;
