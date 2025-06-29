"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from 'react-hot-toast';

const typeOptions = [
  { value: "个人活动", label: "个人活动" },
  { value: "个人比赛", label: "个人比赛" },
  { value: "个人证书", label: "个人证书" },
  { value: "志愿活动", label: "志愿活动" },
];

export default function CreditSubmitPage() {
  const [type, setType] = useState("");
  const [activityName, setActivityName] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerHours, setVolunteerHours] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const dragRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 类型说明映射
  const typeExplanations: Record<string, string> = {
    "个人活动": "如学生会、社团、讲座、社会实践等校内外活动。需上传相关证明材料。",
    "个人比赛": "如各类学科竞赛、技能大赛、文体比赛等。需上传获奖证书或成绩单。",
    "个人证书": "如英语等级证书、计算机等级证书等国家或行业认证。需上传证书文件。",
    "志愿活动": "如志愿服务、公益活动等，需准确填写活动名称和时长，并上传相关证明。"
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setError("请先登录");
      setCheckingAuth(false);
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setCheckingAuth(false);
        // 仅学生、班委可访问
        const allowed = ["student", "monitor", "league_secretary", "study_committee"];
        if (!data.user) {
          setError("请先登录");
          setTimeout(() => router.replace("/login"), 1500);
        } else if (!allowed.includes(data.user.role)) {
          setError("无权限访问该页面");
          setTimeout(() => router.replace("/dashboard"), 1500);
        }
      })
      .catch(() => {
        setError("请先登录");
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  // 拖拽上传相关
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [files]);

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
    if (type === "个人活动") return activityName;
    if (type === "个人比赛") return competitionName;
    if (type === "个人证书") return certificateName;
    if (type === "志愿活动") return volunteerName + (volunteerHours ? `-${volunteerHours}h` : "");
    return "证明材料";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("请先登录");
      return;
    }
    if (!type) {
      toast.error("请选择类型");
      return;
    }
    let valid = false;
    if (type === "个人活动" && activityName) valid = true;
    if (type === "个人比赛" && competitionName) valid = true;
    if (type === "个人证书" && certificateName) valid = true;
    if (type === "志愿活动" && volunteerName && volunteerHours) valid = true;
    if (!valid) {
      toast.error("请填写完整信息");
      return;
    }
    if (files.length === 0) {
      toast.error("请上传证明文件");
      return;
    }
    const formData = new FormData();
    formData.append("type", type);
    if (type === "个人活动") formData.append("activityName", activityName);
    if (type === "个人比赛") formData.append("competitionName", competitionName);
    if (type === "个人证书") formData.append("certificateName", certificateName);
    if (type === "志愿活动") {
      formData.append("volunteerName", volunteerName);
      formData.append("volunteerHours", volunteerHours);
    }
    // 文件重命名
    const newName = getFileName();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const renamed = new File([file], newName + ext, { type: file.type });
      formData.append("proof", renamed);
    }
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("提交成功，等待审批");
      setType(""); setActivityName(""); setCompetitionName(""); setCertificateName(""); setVolunteerName(""); setVolunteerHours("");
      setFiles([]);
    } else {
      toast.error(data.error || "提交失败");
    }
  }

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">正在校验权限...</div>;
  if (error) return <div className="text-center mt-12 text-red-600">{error}</div>;

  return (
    <div className="max-w-md mx-auto card mt-8 sm:mt-16 p-4 sm:p-10 bg-white rounded-2xl shadow-xl relative">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
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
        <select className="input" value={type} onChange={e => setType(e.target.value)} required>
          <option value="">请选择类型</option>
          {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {/* 类型说明区域 */}
        {type && (
          <div className="mb-2 text-blue-700 bg-blue-50 rounded px-3 py-2 text-sm border border-blue-200">
            {typeExplanations[type]}
          </div>
        )}
        {type === "个人活动" && (
          <input className="input" type="text" placeholder="活动名称" value={activityName} onChange={e => setActivityName(e.target.value)} required />
        )}
        {type === "个人比赛" && (
          <input className="input" type="text" placeholder="比赛名称" value={competitionName} onChange={e => setCompetitionName(e.target.value)} required />
        )}
        {type === "个人证书" && (
          <input className="input" type="text" placeholder="证书名称" value={certificateName} onChange={e => setCertificateName(e.target.value)} required />
        )}
        {type === "志愿活动" && (
          <>
            <input className="input" type="text" placeholder="活动名称" value={volunteerName} onChange={e => setVolunteerName(e.target.value)} required />
            <input className="input" type="number" min="0.1" step="0.01" placeholder="志愿时长（小时）" value={volunteerHours} onChange={e => setVolunteerHours(e.target.value)} required />
          </>
        )}
        {/* 自定义文件上传控件 */}
        <div
          ref={dragRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 flex flex-col items-center justify-center cursor-pointer transition hover:bg-blue-100"
          onClick={() => fileRef.current?.click()}
          style={{ minHeight: 90 }}
        >
          <input
            type="file"
            ref={fileRef}
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="flex flex-col items-center">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-blue-400 mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
            <span className="text-blue-700 font-medium">点击或拖拽文件到此处上传</span>
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
                <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:underline text-xs">删除</button>
              </li>
            ))}
          </ul>
        )}
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded shadow transition w-full sm:w-auto" type="submit">提交</button>
        {success && <div className="text-green-600 text-sm">{success}</div>}
      </form>
    </div>
  );
}
