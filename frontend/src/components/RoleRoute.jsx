import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoleRoute({ allowed }) {
  const { role, loading } = useAuth();
  if (loading) return <div className="loader-full"><span className="spinner" /></div>;
  if (!allowed.includes(role)) {
    return <Navigate to={role ? `/${role.toLowerCase()}` : '/login'} replace />;
  }
  return <Outlet />;
}
