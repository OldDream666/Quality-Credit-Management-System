"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RoleConfig,
  CreditTypeConfig,
  StatusConfig,
  FieldConfig,
  PERMISSIONS_CONFIG,
} from '@/config/system';
import { UserRole } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import ColorPicker from '@/components/ui/ColorPicker';
import PermissionSelector from '@/components/ui/PermissionSelector';
import FieldSelector from '@/components/ui/FieldSelector';
import { toast, Toaster } from 'react-hot-toast';

interface ConfigData {
  roles: RoleConfig[];
  creditTypes: CreditTypeConfig[];
  statuses: StatusConfig[];
  availableFields?: FieldConfig[];
}

export default function SystemConfigPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState<ConfigData>({
    roles: [],
    creditTypes: [],
    statuses: []
  });
  const [activeTab, setActiveTab] = useState<'roles' | 'creditTypes'>('roles');
  const router = useRouter();

  // 编辑状态
  const [editingRole, setEditingRole] = useState<RoleConfig | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleConfig | null>(null);
  
  // 学分类型编辑状态
  const [editingCreditType, setEditingCreditType] = useState<CreditTypeConfig | null>(null);
  const [isAddingCreditType, setIsAddingCreditType] = useState(false);
  const [deletingCreditType, setDeletingCreditType] = useState<CreditTypeConfig | null>(null);

  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [newField, setNewField] = useState({ key: '', label: '', type: 'text', required: false, description: '' });
  const [allFields, setAllFields] = useState<FieldConfig[]>([]);

  const [editFieldModalOpen, setEditFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);

  useEffect(() => {
    // 验证管理员权限
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'admin') {
          toast.error("权限不足");
          setTimeout(() => router.replace("/dashboard"), 1500);
        } else {
          setUser(data.user);
          loadConfigs();
        }
      })
      .catch(() => {
        toast.error("请先登录");
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  useEffect(() => {
    if (configData.availableFields && Array.isArray(configData.availableFields)) {
      setAllFields(configData.availableFields);
      return;
    }
    // 兼容旧逻辑
    const fieldSet = new Map<string, FieldConfig>();
    configData.creditTypes.forEach(ct => {
      if (Array.isArray(ct.fields)) {
        ct.fields.forEach(f => {
          if (typeof f === 'object' && 'key' in f) {
            fieldSet.set(f.key, f as FieldConfig);
          } else if (typeof f === 'string') {
            fieldSet.set(f, { key: f, label: f });
          }
        });
      }
    });
    setAllFields(Array.from(fieldSet.values()));
  }, [configData]);

  const loadConfigs = async () => {
    try {
      const response = await fetch("/api/admin/config");
      if (response.ok) {
        const data = await response.json();
        setConfigData(data);
      } else {
        toast.error("加载配置失败");
      }
    } catch (error) {
      toast.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (type: 'role' | 'creditType' | 'status', config: any) => {
    try {
      const response = await fetch("/api/admin/config", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, config })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success("配置保存成功");
        await loadConfigs();
        // 关闭编辑状态
        setEditingRole(null);
        setIsAddingRole(false);
        setEditingCreditType(null);
        setIsAddingCreditType(false);
      } else {
        toast.error(result.error || "保存失败");
        if (result.details) {
          result.details.forEach((error: string) => toast.error(error));
        }
      }
    } catch (error) {
      toast.error("保存配置失败");
    }
  };

  const deleteConfig = async (type: 'role' | 'creditType' | 'status', key: string) => {
    try {
      const response = await fetch(`/api/admin/config?type=${type}&key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success("配置删除成功");
        await loadConfigs();
        // 关闭删除确认对话框
        setDeletingRole(null);
        setDeletingCreditType(null);
      } else {
        toast.error(result.error || "删除失败");
        if (result.details) {
          result.details.forEach((error: string) => toast.error(error));
        }
      }
    } catch (error) {
      toast.error("删除配置失败");
    }
  };

  const createNewRole = (): RoleConfig => ({
    key: 'new_role' as any,
    label: '',
    description: '',
    color: 'bg-gray-100 text-gray-700',
    cardColor: 'from-gray-50 to-gray-100',
    permissions: []
  });

  const createNewCreditType = (): CreditTypeConfig => ({
    key: '新类型' as any,
    label: '',
    description: '',
    color: 'bg-gray-100 text-gray-700',
    cardColor: 'from-gray-50 to-gray-100',
    fields: [],
    scoreCalculation: 'manual',
    scorePerHour: 1 // 默认分数，管理员可修改
  });

  if (loading) {
    return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            ← 返回控制台
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">系统配置管理</h1>
          <p className="text-gray-600 mt-2">管理系统角色、学分类型等配置信息</p>
        </div>

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'roles', label: '角色管理' },
                { key: 'creditTypes', label: '学分类型' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 角色管理 */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">角色配置</h2>
              <Button
                onClick={() => {
                  setEditingRole(createNewRole());
                  setIsAddingRole(true);
                }}
              >
                添加角色
              </Button>
            </div>
            
            <div className="grid gap-4">
              {configData.roles.map(role => (
                <Card key={role.key} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${role.color}`}>
                          {role.label}
                        </span>
                        <span className="text-gray-500 text-sm">({role.key})</span>
                      </div>
                      <p className="text-gray-600 mb-3">{role.description}</p>
                      <div className="text-sm text-gray-500 overflow-x-auto">
                        <strong>权限：</strong>
                        {role.permissions.includes('*') ? (
                          <span className="text-red-600 font-medium">所有权限</span>
                        ) : role.permissions.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {role.permissions.map(permission => {
                              const config = PERMISSIONS_CONFIG[permission];
                              return (
                                <div key={permission} className="flex items-center gap-2">
                                  <span className="text-blue-600">{config?.label || permission}</span>
                                  <span className="text-xs text-gray-400 font-mono">({permission})</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">无权限</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingRole({ ...role })}
                      >
                        编辑
                      </Button>
                      {/* 只有非系统默认角色才能删除 */}
                      {!['admin', 'student'].includes(role.key) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingRole(role)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 学分类型管理 */}
        {activeTab === 'creditTypes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">学分类型配置</h2>
              <Button
                onClick={() => {
                  setEditingCreditType(createNewCreditType());
                  setIsAddingCreditType(true);
                }}
              >
                添加类型
              </Button>
            </div>
            
            <div className="grid gap-4">
              {configData.creditTypes.map(creditType => (
                <Card key={creditType.key} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${creditType.color}`}>
                          {creditType.label}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{creditType.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                          <strong>表单字段：</strong>
                          {creditType.fields.length > 0 ? (
                            <div className="mt-1 space-y-1">
                              {creditType.fields.map(field => {
                                let fieldObj = typeof field === 'string'
                                  ? allFields.find(f => f.key === field) || { key: field, label: field }
                                  : field;
                                return (
                                  <div key={fieldObj.key} className="flex items-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm">
                                    <span className="text-blue-600">{fieldObj.label}</span>
                                    <span className="text-gray-400 font-mono">({fieldObj.key})</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">无字段</span>
                          )}
                        </div>
                        <div>
                          <strong>分数计算：</strong>
                          {creditType.scoreCalculation === 'fixed' && `固定分数 (${creditType.defaultScore || 0}分)`}
                          {creditType.scoreCalculation === 'time_based' && `按时长计算 (${creditType.scorePerHour || 0}分/小时)`}
                          {creditType.scoreCalculation === 'manual' && '手动输入'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingCreditType({ ...creditType })}
                      >
                        编辑
                      </Button>
                      {/* 只有非系统默认类型才能删除 */}
                      {!['个人活动', '个人比赛', '个人证书', '志愿活动'].includes(creditType.key) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingCreditType(creditType)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 编辑角色弹窗 */}
        {editingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
              <div className="p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {isAddingRole ? '添加角色' : '编辑角色'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      角色键 (key)
                    </label>
                    <Input
                      value={editingRole.key}
                      onChange={(e) => setEditingRole({...editingRole, key: e.target.value as any})}
                      placeholder="admin, student, monitor..."
                      disabled={!isAddingRole}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      角色名称
                    </label>
                    <Input
                      value={editingRole.label}
                      onChange={(e) => setEditingRole({...editingRole, label: e.target.value})}
                      placeholder="管理员, 学生, 班长..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                      placeholder="角色功能描述..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker
                      label="标签颜色"
                      value={editingRole.color}
                      onChange={(color) => setEditingRole({...editingRole, color})}
                      type="tag"
                    />
                    <ColorPicker
                      label="卡片颜色"
                      value={editingRole.cardColor}
                      onChange={(cardColor) => setEditingRole({...editingRole, cardColor})}
                      type="gradient"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      权限配置
                    </label>
                    <PermissionSelector
                      selectedPermissions={editingRole.permissions}
                      onChange={(permissions) => setEditingRole({
                        ...editingRole,
                        permissions
                      })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingRole(null);
                      setIsAddingRole(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={() => saveConfig('role', editingRole)}>
                    保存
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 删除角色确认弹窗 */}
        {deletingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                ⚠️ 确认删除角色
              </h3>
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  您确定要删除角色 <strong className="text-red-600">{deletingRole.label}</strong> 吗？
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>警告：</strong>删除角色后，该角色的用户将无法正常使用系统功能。请确保：
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
                    <li>没有用户正在使用此角色</li>
                    <li>已将相关用户转移到其他角色</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeletingRole(null)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onClick={() => deleteConfig('role', deletingRole.key)}
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑学分类型弹窗 */}
        {editingCreditType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden">
              <div className="p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {isAddingCreditType ? '添加学分类型' : '编辑学分类型'}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        类型键 (key)
                      </label>
                      <Input
                        value={editingCreditType.key}
                        onChange={(e) => setEditingCreditType({...editingCreditType, key: e.target.value as any})}
                        placeholder="个人活动, 个人比赛..."
                        disabled={!isAddingCreditType}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        类型名称
                      </label>
                      <Input
                        value={editingCreditType.label}
                        onChange={(e) => setEditingCreditType({...editingCreditType, label: e.target.value})}
                        placeholder="个人活动, 个人比赛..."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      value={editingCreditType.description}
                      onChange={(e) => setEditingCreditType({...editingCreditType, description: e.target.value})}
                      placeholder="学分类型的详细描述..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker
                      label="标签颜色"
                      value={editingCreditType.color}
                      onChange={(color) => setEditingCreditType({...editingCreditType, color})}
                      type="tag"
                    />
                    <ColorPicker
                      label="卡片颜色"
                      value={editingCreditType.cardColor}
                      onChange={(cardColor) => setEditingCreditType({...editingCreditType, cardColor})}
                      type="gradient"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 分数相关表单优先 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        分数计算方式
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={editingCreditType.scoreCalculation}
                        onChange={(e) => setEditingCreditType({
                          ...editingCreditType, 
                          scoreCalculation: e.target.value as any
                        })}
                      >
                        <option value="manual">手动输入</option>
                        <option value="fixed">固定分数</option>
                        <option value="time_based">按时长计算</option>
                      </select>
                      {/* 分数相关表单 */}
                      {editingCreditType.scoreCalculation === 'fixed' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            默认分数
                          </label>
                          <Input
                            type="number"
                            value={editingCreditType.defaultScore || ''}
                            onChange={(e) => setEditingCreditType({
                              ...editingCreditType,
                              defaultScore: Number(e.target.value) || 0
                            })}
                            placeholder="15"
                          />
                        </div>
                      )}
                      {editingCreditType.scoreCalculation === 'time_based' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            每小时分数
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editingCreditType.scorePerHour || ''}
                            onChange={(e) => setEditingCreditType({
                              ...editingCreditType,
                              scorePerHour: Number(e.target.value) || 0
                            })}
                            placeholder="6"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            最终分数 = 志愿时长 × 每小时分数
                          </p>
                        </div>
                      )}
                    </div>
                    {/* 审批角色复选框后置 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        审批角色（可多选）
                      </label>
                      <div className="flex flex-col gap-1">
                        {configData.roles
                          .filter(role => role.key !== 'admin' && role.key !== 'student')
                          .map(role => (
                            <label key={role.key} className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                value={role.key}
                                checked={Array.isArray(editingCreditType.approverRoles) && editingCreditType.approverRoles.includes(role.key as UserRole)}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  const value = role.key;
                                  let next: UserRole[] = Array.isArray(editingCreditType.approverRoles) ? [...editingCreditType.approverRoles] : [];
                                  if (checked) {
                                    if (!next.includes(value as UserRole)) next.push(value as UserRole);
                                  } else {
                                    next = next.filter(k => k !== value);
                                  }
                                  setEditingCreditType({
                                    ...editingCreditType,
                                    approverRoles: next as UserRole[]
                                  });
                                }}
                              />
                              {role.label}
                            </label>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">只有选中的角色才能审批该类型学分</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      表单字段配置
                    </label>
                    <FieldSelector
                      selectedFields={editingCreditType.fields.map(f => typeof f === 'string' ? f : f.key)}
                      onChange={(fields) => setEditingCreditType({
                        ...editingCreditType,
                        fields
                      })}
                      allFields={allFields}
                      renderFieldAction={(field) => (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="ml-2"
                          onClick={() => {
                            setEditingField(field as FieldConfig);
                            setEditFieldModalOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                      )}
                    />
                    <Button
                      className="mt-2"
                      onClick={() => setCustomFieldModalOpen(true)}
                    >
                      添加自定义字段
                    </Button>
                    {customFieldModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                          <h4 className="text-lg font-semibold mb-4">添加自定义字段</h4>
                          <div className="space-y-3">
                            <Input
                              label="字段英文key"
                              value={newField.key}
                              onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                              placeholder="如 reason"
                            />
                            <Input
                              label="字段名称"
                              value={newField.label}
                              onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                              placeholder="如 请假原因"
                            />
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={newField.type}
                              onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}
                            >
                              <option value="text">文本</option>
                              <option value="number">数字</option>
                              <option value="date">日期</option>
                              <option value="file">文件</option>
                            </select>
                            <label className="block text-sm mt-2">
                              <input
                                type="checkbox"
                                checked={newField.required}
                                onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))}
                                className="mr-2"
                              />
                              必填
                            </label>
                            <Input
                              label="描述"
                              value={newField.description}
                              onChange={e => setNewField(f => ({ ...f, description: e.target.value }))}
                              placeholder="字段说明"
                            />
                          </div>
                          <div className="flex justify-end gap-3 mt-6">
                            <Button
                              variant="secondary"
                              onClick={() => setCustomFieldModalOpen(false)}
                            >
                              取消
                            </Button>
                            <Button
                              onClick={async () => {
                                const fieldConfig: FieldConfig = {
                                  key: newField.key,
                                  label: newField.label,
                                  type: newField.type as 'text' | 'number' | 'date' | 'file',
                                  required: newField.required,
                                  description: newField.description
                                };
                                const updatedFields = [...allFields, fieldConfig];
                                setAllFields(updatedFields);
                                // 新增：保存到后端
                                try {
                                  const res = await fetch("/api/admin/config", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      // token 已由 httpOnly cookie 管理，无需传递
                                    },
                                    body: JSON.stringify({
                                      type: "availableFields",
                                      config: updatedFields
                                    })
                                  });
                                  if (res.ok) {
                                    toast.success("自定义字段已保存");
                                    await loadConfigs(); // 刷新配置
                                  } else {
                                    toast.error("保存自定义字段失败");
                                  }
                                } catch {
                                  toast.error("保存自定义字段失败");
                                }
                                setCustomFieldModalOpen(false);
                                setNewField({ key: '', label: '', type: 'text', required: false, description: '' });
                              }}
                            >
                              添加
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 预览区域 */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">预览效果</h4>
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${editingCreditType.color}`}>
                          {editingCreditType.label || '学分类型'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 text-sm">
                        {editingCreditType.description || '学分类型描述...'}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <strong>表单字段：</strong>
                          {editingCreditType.fields.length > 0 ? (
                            editingCreditType.fields.map(field => {
                              let fieldObj = typeof field === 'string'
                                ? allFields.find(f => f.key === field) || { key: field, label: field }
                                : field;
                              return fieldObj.label;
                            }).join(', ')
                          ) : (
                            '无字段'
                          )}
                        </div>
                        <div className="whitespace-nowrap text-xs sm:text-sm">
                          <strong>分数计算：</strong>
                          {editingCreditType.scoreCalculation === 'fixed' && `固定分数 (${editingCreditType.defaultScore || 0}分)`}
                          {editingCreditType.scoreCalculation === 'time_based' && `按时长计算 (${editingCreditType.scorePerHour || 0}分/小时)`}
                          {editingCreditType.scoreCalculation === 'manual' && '手动输入'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingCreditType(null);
                      setIsAddingCreditType(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button onClick={() => saveConfig('creditType', editingCreditType)}>
                    保存
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 删除学分类型确认弹窗 */}
        {deletingCreditType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                ⚠️ 确认删除学分类型
              </h3>
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  您确定要删除学分类型 <strong className="text-red-600">{deletingCreditType.label}</strong> 吗？
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>警告：</strong>删除学分类型后，相关的学分申请可能受到影响。请确保：
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
                    <li>没有待审批的此类型学分申请</li>
                    <li>已备份相关数据</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeletingCreditType(null)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onClick={() => deleteConfig('creditType', deletingCreditType.key)}
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
        )}

        {editFieldModalOpen && editingField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h4 className="text-lg font-semibold mb-4">编辑字段</h4>
              <div className="space-y-3">
                <Input
                  label="字段英文key"
                  value={editingField.key}
                  disabled
                />
                <Input
                  label="字段名称"
                  value={editingField.label}
                  onChange={e => setEditingField(f => f ? { ...f, label: e.target.value } : f)}
                />
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={editingField.type}
                  onChange={e => setEditingField(f => f ? { ...f, type: e.target.value as any } : f)}
                >
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="date">日期</option>
                  <option value="file">文件</option>
                </select>
                <label className="block text-sm mt-2">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={e => setEditingField(f => f ? { ...f, required: e.target.checked } : f)}
                    className="mr-2"
                  />
                  必填
                </label>
                <Input
                  label="描述"
                  value={editingField.description}
                  onChange={e => setEditingField(f => f ? { ...f, description: e.target.value } : f)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setEditFieldModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (!editingField) return;
                    const updatedFields = allFields.map(f => f.key === editingField.key ? editingField : f);
                    setAllFields(updatedFields);
                    // 保存到后端
                    try {
                      const res = await fetch("/api/admin/config", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          // token 已由 httpOnly cookie 管理，无需传递
                        },
                        body: JSON.stringify({
                          type: "availableFields",
                          config: updatedFields
                        })
                      });
                      if (res.ok) {
                        toast.success("字段已保存");
                        await loadConfigs();
                      } else {
                        toast.error("保存字段失败");
                      }
                    } catch {
                      toast.error("保存字段失败");
                    }
                    setEditFieldModalOpen(false);
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
