import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { Loader2 } from 'lucide-react';
import type { PermissionKey } from '../constants/permissions';

interface Props {
  children: React.ReactNode;
  permission?: PermissionKey;
  redirectTo?: string;
}

const RouteGuard: React.FC<Props> = ({
  children,
  permission,
  redirectTo = '/no-permission',
}) => {
  const { user, loading, hasPermission } = useAuth();
  const { storeId } = useStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission(permission, storeId)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;