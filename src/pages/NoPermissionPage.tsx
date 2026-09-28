import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const NoPermissionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">无访问权限</h2>
        <p className="text-sm text-gray-500 mb-6">
          你在当前门店没有访问该页面的权限，请联系管理员。
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </button>
      </div>
    </div>
  );
};

export default NoPermissionPage;