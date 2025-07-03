"use client";
import { useState } from 'react';
import { PERMISSIONS_CONFIG, PermissionConfig } from '@/config/system';

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  className?: string;
}

const PERMISSION_CATEGORIES = {
  credit: { label: '学分管理', color: 'text-blue-600' },
  user: { label: '用户管理', color: 'text-green-600' },
  notice: { label: '公告管理', color: 'text-purple-600' },
  system: { label: '系统管理', color: 'text-red-600' }
};

export default function PermissionSelector({ 
  selectedPermissions, 
  onChange, 
  className = '' 
}: PermissionSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    credit: true,
    user: false,
    notice: false,
    system: false
  });

  // 检查是否有全部权限
  const hasAllPermissions = selectedPermissions.includes('*');

  // 按分类分组权限
  const permissionsByCategory = Object.values(PERMISSIONS_CONFIG).reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PermissionConfig[]>);

  const handlePermissionChange = (permission: string, checked: boolean) => {
    let newPermissions = [...selectedPermissions];
    
    if (permission === '*') {
      // 处理全部权限
      if (checked) {
        newPermissions = ['*'];
      } else {
        newPermissions = [];
      }
    } else {
      // 处理单个权限
      if (checked) {
        // 添加权限，并移除全部权限标记
        newPermissions = newPermissions.filter(p => p !== '*');
        if (!newPermissions.includes(permission)) {
          newPermissions.push(permission);
        }
      } else {
        // 移除权限
        newPermissions = newPermissions.filter(p => p !== permission && p !== '*');
      }
    }
    
    onChange(newPermissions);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const isPermissionSelected = (permission: string) => {
    return hasAllPermissions || selectedPermissions.includes(permission);
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">权限配置</h4>
        
        {/* 全部权限选项 */}
        <div className="mb-3 p-3 bg-white rounded border">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasAllPermissions}
              onChange={(e) => handlePermissionChange('*', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-red-600">所有权限 (*)</span>
              <p className="text-xs text-gray-500">拥有系统的所有权限（仅限管理员）</p>
            </div>
          </label>
        </div>

        {/* 分类权限 */}
        {Object.entries(permissionsByCategory).map(([category, permissions]) => {
          const categoryInfo = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
          const isExpanded = expandedCategories[category];
          
          return (
            <div key={category} className="mb-3 bg-white rounded border">
              {/* 分类标题 */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className={`text-sm font-medium ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 权限列表 */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isPermissionSelected(permission.key)}
                        onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                        disabled={hasAllPermissions}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {permission.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {permission.description}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {permission.key}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 已选权限摘要 */}
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <h5 className="text-xs font-medium text-blue-800 mb-1">已选权限摘要</h5>
        <div className="text-xs text-blue-600">
          {hasAllPermissions ? (
            <span className="font-medium">所有权限 (*)</span>
          ) : selectedPermissions.length > 0 ? (
            <div className="space-y-1">
              {selectedPermissions.map(permission => {
                const config = PERMISSIONS_CONFIG[permission];
                return (
                  <div key={permission} className="flex justify-between">
                    <span>{config?.label || permission}</span>
                    <span className="font-mono text-blue-400">{permission}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-gray-500">未选择任何权限</span>
          )}
        </div>
      </div>
    </div>
  );
}
