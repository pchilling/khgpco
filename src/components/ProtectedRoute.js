import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuth } from '../services/auth';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user } = checkAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // 將使用者重定向到登入頁面，並記住他們試圖訪問的頁面
    return <Navigate to="/crm/login" state={{ from: location }} replace />;
  }

  // 如果指定了所需角色，檢查用戶是否具有該角色
  if (requiredRole && user.role !== requiredRole) {
    // 如果用戶沒有所需角色，重定向到適當的儀表板
    const redirectPath = user.role === 'manager' ? '/crm/admin/overview' : '/crm/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute; 