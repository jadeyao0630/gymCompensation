import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import type { PermissionKey } from '../constants/permissions';

interface Props {
  permission: PermissionKey;
  storeId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

const PermissionGate: React.FC<Props> = ({
  permission,
  storeId,
  fallback = null,
  children,
}) => {
  const { hasPermission } = useAuth();
  const { storeId: currentStoreId } = useStore();
  const sid = storeId ?? currentStoreId;

  if (!hasPermission(permission, sid)) return <>{fallback}</>;
  return <>{children}</>;
};

export default PermissionGate;