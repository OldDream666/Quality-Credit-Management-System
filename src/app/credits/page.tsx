"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-hot-toast';
import type { FieldConfig } from '@/config/system';

// 从配置系统获取类型选项（将通过API动态加载）
let typeOptions: Array<{value: string, label: string}> = [];
let creditTypesConfig: Record<string, any> = {};

export default function CreditSubmitPage() {
  const [type, setType] = useState("");
  const [activityName, setActivityName] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerHours, setVolunteerHours] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // 动态字段数据
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const dragRef = useRef<HTMLDivElement>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [systemConfigs, setSystemConfigs] = useState<any>({ roles: [] });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [availableFields, setAvailableFields] = useState<FieldConfig[]>([]);
  // 提交防抖/禁用
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // 类型说明映射（从动态配置获取）
  const getTypeExplanation = (type: string) => {
    const config = creditTypesConfig[type];
    return config?.description || '';
  };

  // 获取当前类型的字段配置
  const getCurrentFields = (): string[] => {
    if (!type) return [];
    const config = creditTypesConfig[type];
    return config?.fields || [];
  };

  // 获取当前类型的字段label
  function getFieldLabelByKey(fieldKey: string): string {
    // 优先查 availableFields
    const found = availableFields.find(f => f.key === fieldKey);
    if (found && found.label) return found.label;
    return '';
  };

  // 新增：获取字段类型
  function getFieldType(fieldKey: string): FieldConfig['type'] | undefined {
    return availableFields.find(f => f.key === fieldKey)?.type;
  }

  // 新增：获取字段是否必填（以配置为准，未配置则不必填）
  function isFieldRequired(fieldKey: string): boolean {
    const cfg = availableFields.find(f => f.key === fieldKey);
    return !!cfg?.required;
  }

  // 获取当前类型字段description
  function getFieldDescription(fieldKey: string): string {
    const found = availableFields.find(f => f.key === fieldKey);
    if (found && found.description) return found.description;
    return '';
  }

  useEffect(() => {
    // 加载配置
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/config/credit-types");
        if (response.ok) {
          const data = await response.json();
          typeOptions = data.options;
          // 将类型数组转换为配置对象
          if (data.types && data.types.length > 0) {
            creditTypesConfig = {};
            data.types.forEach((config: any) => {
              creditTypesConfig[config.key] = config;
            });
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    // 检查登录状态（token 保存在 httpOnly cookie 中）
    fetch("/api/auth/me", { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setCheckingAuth(false);
        if (!data.user) {
          setTimeout(() => router.replace("/login"), 1500);
        }
      })
      .catch(() => {
        setUser(null);
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  useEffect(() => {
    fetch("/api/config/system")
      .then(res => res.ok ? res.json() : null)
      .then(configData => {
        if (configData?.availableFields) setAvailableFields(configData.availableFields);
        setSystemConfigs(configData);
        setConfigLoaded(true);
      });
  }, []);

  // 拖拽上传相关
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [files, isSubmitting]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 文件选择
  function handleFiles(selected: FileList | File[]) {
    let arr = Array.from(selected);
    // 类型校验
    arr = arr.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    // 数量限制
    const newFiles = [...files, ...arr].slice(0, 6);
    setFiles(newFiles);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
  }

  function removeFile(idx: number) {
    setFiles(files => files.filter((_, i) => i !== idx));
  }

  function getFileName() {
    switch (type) {
      case "个人活动":
        return activityName;
      case "个人比赛":
        return competitionName;
      case "个人证书":
        return certificateName;
      case "志愿活动":
        return volunteerName + (volunteerHours ? `-${volunteerHours}h` : "");
      default:
        return "证明材料";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 防止重复提交：若正在提交则直接返回
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    if (!user) {
      toast.error("请先登录");
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!type) {
      toast.error("请选择类型");
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // 验证必填字段
    const currentFields = getCurrentFields();
    const requiredFields = currentFields.filter((field: string) => isFieldRequired(field));
    
    for (const fieldKey of requiredFields) {
      const fieldType = getFieldType(fieldKey);
      if (fieldType === 'file' || fieldKey === 'proofFiles') {
        // 检查文件上传
        if (files.length === 0) {
          toast.error("请上传证明文件");
          submittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      } else {
        // 检查其他字段
        const value = fieldValues[fieldKey];
        if (!value || value.trim() === '') {
          const fieldLabel = getFieldLabelByKey(fieldKey);
          toast.error(`请填写${fieldLabel}`);
          submittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append("type", type);
    
    // 添加所有字段数据
    for (const fieldKey of currentFields) {
      const value = fieldValues[fieldKey];
      if (value) {
        formData.append(fieldKey, value);
      }
    }

    // 文件重命名
    const newName = getFileName();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const renamed = new File([file], newName + ext, { type: file.type });
      formData.append("proof", renamed);
    }

    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("提交成功，等待审批");
        setType(""); 
        resetFields();
        setFiles([]);
      } else {
        toast.error(data.error || "提交失败");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // 处理动态字段值变化
  const handleFieldChange = (fieldKey: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    // 为了兼容现有代码，同时更新对应的状态
    switch (fieldKey) {
      case 'activityName':
        setActivityName(value);
        break;
      case 'competitionName':
        setCompetitionName(value);
        break;
      case 'certificateName':
        setCertificateName(value);
        break;
      case 'volunteerName':
        setVolunteerName(value);
        break;
      case 'volunteerHours':
        setVolunteerHours(value);
        break;
    }
  };

  // 重置所有字段
  const resetFields = () => {
    setFieldValues({});
    setActivityName("");
    setCompetitionName("");
    setCertificateName("");
    setVolunteerName("");
    setVolunteerHours("");
  };

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return <div className="text-center mt-12 text-red-600">未登录</div>;
  if (user.role === 'admin') return <div className="text-center mt-12 text-red-600">无权限</div>;
  const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user?.role);
  const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
  if (!userPermissions.includes('credits.submit')) {
    return <div className="text-center mt-12 text-red-600">无权限</div>;
  }

  if (loadingConfig || !systemConfigs.roles) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!configLoaded) return <div>加载中...</div>;

  return (
    <div className="max-w-md mx-auto card mt-8 sm:mt-16 p-4 sm:p-10 bg-white rounded-2xl shadow-xl relative">
      <span
        className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none"
        onClick={() => router.push("/dashboard")}
      >
        <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        返回
      </span>
      <div style={{ height: 12 }} />
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-blue-700">素质学分申请</h1>
      <form onSubmit={handleSubmit} className="space-y-6 flex flex-col">
        <select className="input" value={type} onChange={e => {
          setType(e.target.value);
          resetFields(); // 切换类型时重置所有字段
        }} required>
          <option value="">请选择类型</option>
          {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {/* 类型说明区域 */}
        {type && (
          <div className="mb-2 text-blue-700 bg-blue-50 rounded px-3 py-2 text-sm border border-blue-200">
            {getTypeExplanation(type)}
          </div>
        )}
        {/* 动态字段渲染 */}
        {type && getCurrentFields().map((fieldKey: string) => {
          const fieldLabel = getFieldLabelByKey(fieldKey);
          const fieldValue = fieldValues[fieldKey] || '';
          const fieldDescription = getFieldDescription(fieldKey);
          const fieldType = getFieldType(fieldKey);
          const required = isFieldRequired(fieldKey);
          
          // 证明材料上传字段，按类型
          if (fieldType === 'file') {
            return (
              <div key={fieldKey}>
                {/* 自定义文件上传控件 */}
                <div
                  ref={dragRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 flex flex-col items-center justify-center cursor-pointer transition hover:bg-blue-100"
                  onClick={() => { if (!isSubmitting) fileRef.current?.click(); }}
                  aria-disabled={isSubmitting}
                  style={{ minHeight: 90 }}
                >
                  <input
                    type="file"
                    ref={fileRef}
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                    disabled={isSubmitting}
                  />
                  <div className="flex flex-col items-center">
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-blue-400 mb-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
                    </svg>
                    <span className="text-blue-700 font-medium">点击或拖拽文件到此处上传{required ? '（必填）' : ''}{isSubmitting ? '（提交中，已禁用）' : ''}</span>
                    <span className="text-gray-400 text-xs mt-1">支持图片、PDF，最多6个文件</span>
                  </div>
                </div>
                {/* 文件列表 */}
                {files.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1">
                        {file.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded text-gray-500 text-xs">PDF</span>
                        )}
                        <span className="flex-1 truncate">{file.name}</span>
                        <button type="button" onClick={() => !isSubmitting && removeFile(idx)} className="text-red-500 hover:underline text-xs" disabled={isSubmitting}>删除</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
          
          if (fieldKey === 'volunteerHours') {
            const config = creditTypesConfig[type];
            const scorePerHour = config?.scorePerHour || 0;
            const hours = parseFloat(fieldValue) || 0;
            const calculatedScore = hours * scorePerHour;
            
            return (
              <div key={fieldKey}>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.01"
                  placeholder={`${fieldLabel}（小时）`}
                  value={fieldValue}
                  onChange={e => handleFieldChange(fieldKey, e.target.value)}
                  required={required}
                />
                {hours > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-700">
                      📊 预计得分：{hours.toFixed(2)} 小时 × {scorePerHour} 分/小时 = <strong>{calculatedScore.toFixed(2)} 分</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          }
          
          if (fieldKey === 'eventDate') {
            return (
              <input
                key={fieldKey}
                className="input"
                type="date"
                placeholder={fieldLabel}
                value={fieldValue}
                onChange={e => handleFieldChange(fieldKey, e.target.value)}
                required={required}
              />
            );
          }
          
          if (fieldKey === 'score') {
            return (
              <input
                key={fieldKey}
                className="input"
                type="number"
                min="0"
                step="0.1"
                placeholder={`${fieldLabel}（分）`}
                value={fieldValue}
                onChange={e => handleFieldChange(fieldKey, e.target.value)}
                required={required}
              />
            );
          }
          
          if (fieldKey === 'remarks') {
            return (
              <textarea
                key={fieldKey}
                className="input"
                rows={3}
                placeholder={fieldLabel}
                value={fieldValue}
                onChange={e => handleFieldChange(fieldKey, e.target.value)}
              />
            );
          }
          
          // 默认文本输入
          return (
            <input
              key={fieldKey}
              className="input"
              type="text"
              placeholder={fieldLabel + (fieldDescription ? `（${fieldDescription}）` : '')}
              value={fieldValue}
              onChange={e => handleFieldChange(fieldKey, e.target.value)}
              required={required}
            />
          );
        })}
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded shadow transition w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? '提交中…' : '提交'}
        </button>
        {success && <div className="text-green-600 text-sm">{success}</div>}
      </form>
    </div>
  );
}
