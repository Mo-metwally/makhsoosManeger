import './AdminGuard.scss';
import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminNavBar from './AdminNavBar';
import { useAuth } from '../context/AuthContext';

const AdminGuard = ({ children, hideNavBar = false }) => {
  const { user } = useAuth();

  // If the user is not logged in or not an Admin/SuperAdmin, redirect to home
  if (!user || (user.role !== 'Admin' && user.role !== 'SuperAdmin')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="adminguard-style-1">
      {!hideNavBar && <AdminNavBar />}
      {children}
    </div>
  );
};

export default AdminGuard;
