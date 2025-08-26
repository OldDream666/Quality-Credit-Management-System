"use client";
import { useState, useRef, useEffect } from "react";
import { validateUserForm, getPasswordStrength } from "@/lib/validation";
import { toast } from 'react-hot-toast';

function InputField({ label, value, onChange, required, error, type = "text", placeholder, onBlur, disabled, autoFocus, tip }: any) {
  return (
    <div className="mb-2">
      <label className="block font-medium mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 ${error ? 'border-red-400' : 'border-gray-300'}`}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        onBlur={onBlur}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      {tip && <div className="text-xs text-gray-400 mt-1">{tip}</div>}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, required, error, options, placeholder, disabled }: any) {
  return (
    <div className="mb-2">
      <label className="block font-medium mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      <select
        className={`border p-2 rounded w-full focus:ring-2 focus:ring-blue-400 ${error ? 'border-red-400' : 'border-gray-300'}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">{placeholder || '请选择'}</option>
        {Array.isArray(options) && options.length > 0 && typeof options[0] === 'object'
          ? options.map((opt: { value: string, label: string }) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))
          : options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}

const roleOptions = [
  { value: "student", label: "学生" },
  { value: "monitor", label: "班长" },
  { value: "league_secretary", label: "团支书" },
  { value: "study_committee", label: "学习委员" },
  { value: "admin", label: "管理员" },
];

export default function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    role: "student",
    username: "",
    password: "",
    name: "",
    studentId: "",
    grade: "",
    major: "",
    className: ""
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  // 架构数据
  const [grades, setGrades] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // 获取年级列表
  useEffect(() => {
    fetch("/api/structure/grades")
      .then(res => res.json())
      .then(data => {
        const sorted = (data.grades || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        setGrades(sorted);
      });
  }, []);

  // 根据年级获取专业列表
  useEffect(() => {
    const url = form.grade 
      ? `/api/structure/majors?grade_id=${form.grade}`
      : '/api/structure/majors';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const sorted = (data.majors || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        setMajors(sorted);
        // 如果当前选择的专业不在新的专业列表中，清空专业选择
        if (form.major && !data.majors?.some((m: any) => m.id === form.major)) {
          setForm(f => ({ ...f, major: '', className: '' }));
        }
      });
  }, [form.grade]);

  // 联动获取班级
  useEffect(() => {
    if (form.grade && form.major) {
      fetch(`/api/structure/classes?grade_id=${form.grade}&major_id=${form.major}`)
        .then(res => res.json())
        .then(data => {
          const sorted = (data.classes || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
          setClasses(sorted);
        });
    } else {
      setClasses([]);
    }
  }, [form.grade, form.major]);

  // 学号输入时自动同步用户名
  function handleStudentIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, studentId: e.target.value, username: e.target.value }));
  }

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors((e: any) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    // 校验
    const validation = validateUserForm(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    // 获取年级、专业和班级的名称
    const selectedGrade = grades.find((g: any) => g.id === parseInt(form.grade));
    const selectedMajor = majors.find((m: any) => m.id === parseInt(form.major));
    const selectedClass = classes.find((c: any) => c.id === parseInt(form.className));

    // 提交
    const res = await fetch("/api/admin/users", {
      method: "POST",
  headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        password: form.password,
        name: form.name,
        student_id: form.studentId,
        role: form.role,
        grade: selectedGrade?.name || null,
        major: selectedMajor?.name || null,
        class: selectedClass?.name || null
      })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      toast.success("添加成功");
      setForm({ role: "student", username: "", password: "", name: "", studentId: "", grade: "", major: "", className: "" });
      onSuccess();
    } else {
      toast.error(data.error || "添加失败");
    }
  }

  // 支持回车提交
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter') handleSubmit(e);
  }

  // 密码强度
  const passwordStrength = getPasswordStrength(form.password);

  // 是否为管理员
  const isAdmin = form.role === 'admin';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mb-6 shadow-lg rounded-xl p-6 bg-white" onKeyDown={handleKeyDown}>
      {/* 基础信息分组 */}
      <div className="mb-6">
        <div className="text-lg font-bold mb-2">基础信息</div>
        <SelectField
          label="角色"
          value={form.role}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('role', e.target.value)}
          required
          error={errors.role}
          options={roleOptions}
          placeholder="请选择角色"
        />
        <InputField
          label="用户名"
          value={form.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('username', e.target.value)}
          required
          error={errors.username}
          placeholder="用户名"
          autoFocus={!isAdmin}
          disabled={isAdmin && !!form.studentId}
        />
        <InputField
          label="密码"
          value={form.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('password', e.target.value)}
          required
          error={errors.password}
          type="password"
          placeholder="密码"
          tip={form.password && `密码强度：${passwordStrength}`}
        />
        <InputField
          label="姓名"
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
          required={!isAdmin}
          error={errors.name}
          placeholder="姓名"
        />
        <InputField
          label="学号"
          value={form.studentId}
          onChange={handleStudentIdChange}
          required={!isAdmin}
          error={errors.studentId}
          placeholder="学号"
        />
        {!isAdmin && (
          <>
            <SelectField
              label="年级"
              value={form.grade}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('grade', e.target.value)}
              required
              error={errors.grade}
              options={grades.map((g: any) => ({ value: g.id, label: g.name }))}
              placeholder="请选择年级"
            />
            <SelectField
              label="专业"
              value={form.major}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('major', e.target.value)}
              required
              error={errors.major}
              options={majors.map((m: any) => ({ value: m.id, label: m.name }))}
              placeholder="请选择专业"
              disabled={!form.grade}
            />
            <SelectField
              label="班级"
              value={form.className}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('className', e.target.value)}
              required
              error={errors.className}
              options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="请选择班级"
              disabled={!form.major}
            />
          </>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition w-full sm:w-auto disabled:opacity-60" type="submit" disabled={loading}>{loading ? "添加中..." : "添加"}</button>
      </div>
    </form>
  );
}
