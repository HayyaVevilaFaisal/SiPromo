import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  if (!user && !token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
