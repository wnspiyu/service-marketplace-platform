import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { UserType } from './types/user';
import 'leaflet/dist/leaflet.css';

//Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CustomerDashboard from './pages/customer/Dashboard';
import ProviderDashboard from './pages/provider/Dashboard';
import CreateTaskPage from './pages/customer/CreateTask';
import TaskDetailsPage from './pages/customer/TaskDetails';
import NotificationsPage from './pages/provider/Notifications';
import ProviderTaskDetail from './pages/provider/TaskDetail';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

        {/* Customer Routes */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute requiredRole={UserType.CUSTOMER}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/create-task"
          element={
            <ProtectedRoute requiredRole={UserType.CUSTOMER}>
              <CreateTaskPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/tasks/:taskId"
          element={
            <ProtectedRoute requiredRole={UserType.CUSTOMER}>
              <TaskDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Provider Routes */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute requiredRole={UserType.SERVICE_PROVIDER}>
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/notifications"
          element={
            <ProtectedRoute requiredRole={UserType.SERVICE_PROVIDER}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/tasks/:notificationId"
          element={
            <ProtectedRoute requiredRole={UserType.SERVICE_PROVIDER}>
              <ProviderTaskDetail />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
