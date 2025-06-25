"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function StructurePage() {
  const router = useRouter();
  // 年级
  const [grades, setGrades] = useState<any[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [editingGradeName, setEditingGradeName] = useState("");
  // 专业
  const [majors, setMajors] = useState<any[]>([]);
  const [newMajor, setNewMajor] = useState("");
  const [editingMajorId, setEditingMajorId] = useState<number|null>(null);
  const [editingMajorName, setEditingMajorName] = useState("");
  // 班级
  const [classes, setClasses] = useState<any[]>([]);
  const [newClass, setNewClass] = useState({ name: "", grade_id: "", major_id: "" });
  const [editingClassId, setEditingClassId] = useState<number|null>(null);
  const [editingClass, setEditingClass] = useState<{name:string,grade_id:string,major_id:string}>({name:"",grade_id:"",major_id:""});

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [tab, setTab] = useState('info');

  const [gradeSort, setGradeSort] = useState<{field: string, asc: boolean}>({field: 'name', asc: true});
  const [majorSort, setMajorSort] = useState<{field: string, asc: boolean}>({field: 'name', asc: true});
  const [classSort, setClassSort] = useState<{field: string, asc: boolean}>({field: 'name', asc: true});

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importResult, setImportResult] = useState<any[]|null>(null);

  // 加载全部数据
  useEffect(() => {
    fetchGrades();
    fetchMajors();
    fetchClasses();
  }, []);

  async function fetchGrades() {
    const res = await fetch("/api/structure/grades");
    const data = await res.json();
    setGrades(data.grades || []);
  }
  async function fetchMajors() {
    const res = await fetch("/api/structure/majors");
    const data = await res.json();
    setMajors(data.majors || []);
  }
  async function fetchClasses() {
    const res = await fetch("/api/structure/classes");
    const data = await res.json();
    setClasses(data.classes || []);
  }

  // 页面加载时获取所有用户
  useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true);
      const t = localStorage.getItem("token");
      if (!t) return setUsersLoading(false);
      const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (res.ok) setAllUsers(data.users);
      setUsersLoading(false);
    }
    fetchUsers();
  }, []);

  // 右侧根据选中节点筛选用户
  const filteredUsers = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === 'grade') {
      return allUsers.filter(u => String(u.grade) === String(selectedNode.gradeName));
    }
    if (selectedNode.type === 'major') {
      return allUsers.filter(u => String(u.grade) === String(selectedNode.gradeName) && String(u.major) === String(selectedNode.majorName));
    }
    if (selectedNode.type === 'class') {
      return allUsers.filter(u => String(u.grade) === String(selectedNode.gradeName) && String(u.major) === String(selectedNode.majorName) && String(u.class) === String(selectedNode.className));
    }
    return [];
  }, [allUsers, selectedNode]);

  // 年级操作
  async function addGrade() {
    if (!newGrade.trim()) return;
    await fetch("/api/structure/grades", { method: "POST", body: JSON.stringify({ name: newGrade }), headers: { "Content-Type": "application/json" } });
    setNewGrade("");
    fetchGrades();
  }
  async function deleteGrade(id: number) {
    if (!window.confirm("确定要删除该年级？删除后该年级下所有用户的年级字段将被清空。")) return;
    await fetch("/api/structure/grades", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
    fetchGrades();
    fetchClasses();
  }
  function startEditGrade(g: any) {
    setEditingGradeId(g.id);
    setEditingGradeName(g.name);
  }
  function cancelEditGrade() {
    setEditingGradeId(null);
    setEditingGradeName("");
  }
  async function saveEditGrade() {
    if (!editingGradeName.trim() || editingGradeId == null) return;
    await fetch("/api/structure/grades", { method: "PUT", body: JSON.stringify({ id: editingGradeId, name: editingGradeName }), headers: { "Content-Type": "application/json" } });
    setEditingGradeId(null);
    setEditingGradeName("");
    fetchGrades();
  }

  // 专业操作
  async function addMajor() {
    if (!newMajor.trim()) return;
    await fetch("/api/structure/majors", { method: "POST", body: JSON.stringify({ name: newMajor }), headers: { "Content-Type": "application/json" } });
    setNewMajor("");
    fetchMajors();
  }
  async function deleteMajor(id: number) {
    if (!window.confirm("确定要删除该专业？删除后该专业下所有用户的专业字段将被清空。")) return;
    await fetch("/api/structure/majors", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
    fetchMajors();
    fetchClasses();
  }
  function startEditMajor(m:any){ setEditingMajorId(m.id); setEditingMajorName(m.name); }
  function cancelEditMajor(){ setEditingMajorId(null); setEditingMajorName(""); }
  async function saveEditMajor(){ if(!editingMajorName.trim()||editingMajorId==null)return; await fetch("/api/structure/majors",{method:"PUT",body:JSON.stringify({id:editingMajorId,name:editingMajorName}),headers:{"Content-Type":"application/json"}}); setEditingMajorId(null); setEditingMajorName(""); fetchMajors(); fetchClasses(); }

  // 班级操作
  async function addClass() {
    if (!newClass.name.trim() || !newClass.grade_id || !newClass.major_id) return;
    await fetch("/api/structure/classes", { method: "POST", body: JSON.stringify(newClass), headers: { "Content-Type": "application/json" } });
    setNewClass({ name: "", grade_id: "", major_id: "" });
    fetchClasses();
  }
  async function deleteClass(id: number) {
    if (!window.confirm("确定要删除该班级？删除后该班级下所有用户的班级字段将被清空。")) return;
    await fetch("/api/structure/classes", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
    fetchClasses();
  }
  function startEditClass(cls:any){ setEditingClassId(cls.id); setEditingClass({name:cls.name,grade_id:String(cls.grade_id),major_id:String(cls.major_id)}); }
  function cancelEditClass(){ setEditingClassId(null); setEditingClass({name:"",grade_id:"",major_id:""}); }
  async function saveEditClass(){ if(!editingClass.name.trim()||!editingClass.grade_id||!editingClass.major_id||editingClassId==null)return; await fetch("/api/structure/classes",{method:"PUT",body:JSON.stringify({id:editingClassId,name:editingClass.name,grade_id:editingClass.grade_id,major_id:editingClass.major_id}),headers:{"Content-Type":"application/json"}}); setEditingClassId(null); setEditingClass({name:"",grade_id:"",major_id:""}); fetchClasses(); }

  // 组合所有班级的扁平数据
  const classTableData = useMemo(() => {
    return classes.map(cls => {
      const grade = grades.find(g => g.id === cls.grade_id);
      const major = majors.find(m => m.id === cls.major_id);
      return {
        id: cls.id,
        className: cls.name,
        gradeName: grade?.name || '-',
        majorName: major?.name || '-',
        gradeId: grade?.id,
        majorId: major?.id,
      };
    });
  }, [classes, grades, majors]);

  // 组装树形结构
  const buildTree = useCallback(() => {
    // 年级排序：数字升序
    const sortedGrades = [...grades].sort((a, b) => {
      const na = parseInt(a.name.replace(/\D/g, '')) || 0;
      const nb = parseInt(b.name.replace(/\D/g, '')) || 0;
      return na - nb;
    });
    return sortedGrades.map(grade => ({
      ...grade,
      type: 'grade',
      // 专业排序：拼音/中文升序
      children: [...majors.filter(m => classes.some(c => c.grade_id === grade.id && c.major_id === m.id))]
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        .map(major => ({
          ...major,
          type: 'major',
          // 班级排序：数字升序
          children: [...classes.filter(c => c.grade_id === grade.id && c.major_id === major.id)]
            .sort((a, b) => {
              const na = parseInt(a.name.replace(/\D/g, '')) || 0;
              const nb = parseInt(b.name.replace(/\D/g, '')) || 0;
              return na - nb;
            })
            .map(cls => ({
              ...cls,
              type: 'class',
              children: []
            }))
        }))
    }));
  }, [grades, majors, classes]);

  const [expanded, setExpanded] = useState<{[key:string]:boolean}>({});
  const toggleExpand = (key:string) => setExpanded(e => ({...e, [key]:!e[key]}));

  function handleImportFile(e:any){ setImportFile(e.target.files[0]||null); }
  async function handleImportSubmit(){
    if(!importFile){alert('请先选择文件');return;}
    setImporting(true); setImportResult(null);
    const formData = new FormData(); formData.append('file', importFile);
    const res = await fetch('/api/structure/import', { method: 'POST', body: formData });
    const data = await res.json();
    setImporting(false); setImportResult(data.results||[{success:false,message:data.error||'导入失败'}]);
    if(res.ok){ fetchGrades(); fetchMajors(); fetchClasses(); }
  }

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-0 py-8">
      <div className="w-[80vw] max-w-[1500px] bg-white rounded-xl shadow-lg p-8 flex gap-12 relative overflow-x-auto">
        {/* 返回按钮 */}
        <div className="absolute left-6 top-6 z-10">
          <span className="text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none" onClick={() => router.push('/admin/users')}>
            <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            返回
          </span>
        </div>
        {/* 左侧树形结构 */}
        <div className="w-72 min-w-[200px] border-r pr-8">
          <div style={{ height: 24 }} />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-700">组织架构</h2>
          <div style={{ height: 24 }} />
          <TreeView treeData={buildTree()} expanded={expanded} toggleExpand={toggleExpand} onSelect={setSelectedNode} selectedNode={selectedNode} />
        </div>
        {/* 右侧内容区 */}
        <div className="flex-1 min-w-0">
          {/* 标签栏 */}
          <div className="flex gap-8 border-b mb-6">
            <button
              className={`px-6 py-2 text-lg font-bold border-b-2 transition-all ${tab==='info' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
              onClick={()=>setTab('info')}
            >架构信息</button>
            <button
              className={`px-6 py-2 text-lg font-bold border-b-2 transition-all ${tab==='unit' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
              onClick={()=>setTab('unit')}
            >架构单元</button>
          </div>
          {/* 标签内容 */}
          {tab === 'info' && (
            <>
              {/* 用户列表联动显示 */}
              <div className="border-t my-6" />
              <div>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
                ) : selectedNode ? (
                  <div>
                    <UserTable users={filteredUsers} />
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-12">请选择左侧节点查看用户</div>
                )}
              </div>
            </>
          )}
          {tab === 'unit' && (
            <>
              <div className="flex items-center mb-4 gap-4">
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow" onClick={()=>setShowImport(true)}>批量导入</button>
                <a href="/架构导入模板.xlsx" className="text-blue-600 underline" download>下载模板</a>
              </div>
              {showImport && (
                <div className="mb-6 p-4 bg-gray-50 rounded border flex flex-col gap-2">
                  <input type="file" accept=".xlsx" onChange={handleImportFile} />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded w-32" onClick={handleImportSubmit} disabled={importing}>{importing?'导入中...':'开始导入'}</button>
                  {importResult && <div className="mt-2 text-sm">{importResult.map((r,i)=>(<div key={i} className={r.success?"text-green-600":"text-red-600"}>{r.message}</div>))}</div>}
                  <button className="text-gray-500 underline mt-2 w-20" onClick={()=>setShowImport(false)}>关闭</button>
                </div>
              )}
              {/* 功能区卡片 */}
              <div className="bg-white rounded-xl shadow border p-6 mb-8 min-w-[900px] min-h-[700px] flex" style={{overflowX:'auto'}}>
                {/* 年级管理 */}
                <div className="md:pr-6 md:border-r flex flex-col items-start h-full min-h-0 flex-1">
                  <div className="text-xl font-extrabold mb-4 text-gray-800">年级管理</div>
                  <div className="space-y-3 w-full">
                    <Input value={newGrade} onChange={e=>setNewGrade(e.target.value)} placeholder="新增年级，如2024级" className="w-full" />
                    <Button onClick={addGrade} className="w-full">添加</Button>
                    <div className="mt-2 flex-1 min-h-0 overflow-y-auto w-full pr-2">
                      <table className="min-w-full text-base text-left border bg-white rounded-xl overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 font-bold text-gray-700 cursor-pointer select-none" onClick={()=>setGradeSort(s=>({field:'name',asc:s.field==='name'?!s.asc:true}))}>
                              年级名称 {gradeSort.field==='name' && (gradeSort.asc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-2 font-bold text-gray-700 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...grades].sort((a,b)=>{
                            if(gradeSort.asc) return a.name.localeCompare(b.name,'zh-CN');
                            else return b.name.localeCompare(a.name,'zh-CN');
                          }).map(g=>(
                            <tr key={g.id} className="border-b last:border-b-0">
                              {editingGradeId===g.id ? (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <Input value={editingGradeName} onChange={e=>setEditingGradeName(e.target.value)} className="w-32" autoFocus onKeyDown={e=>{if(e.key==='Enter')saveEditGrade();if(e.key==='Escape')cancelEditGrade();}} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={saveEditGrade}>保存</button>
                                    <button className="text-gray-500 hover:underline" onClick={cancelEditGrade}>取消</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap">{g.name}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={()=>startEditGrade(g)}>编辑</button>
                                    <button className="text-red-500 hover:underline" onClick={()=>deleteGrade(g.id)}>删除</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {/* 专业管理 */}
                <div className="md:px-6 md:border-r flex flex-col items-start h-full min-h-0 flex-1">
                  <div className="text-xl font-extrabold mb-4 text-gray-800">专业管理</div>
                  <div className="space-y-3 w-full">
                    <Input value={newMajor} onChange={e=>setNewMajor(e.target.value)} placeholder="新增专业，如计算机" className="w-full" />
                    <Button onClick={addMajor} className="w-full">添加</Button>
                    <div className="mt-2 flex-1 min-h-0 overflow-y-auto w-full pr-2">
                      <table className="min-w-full text-base text-left border bg-white rounded-xl overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 font-bold text-gray-700 cursor-pointer select-none" onClick={()=>setMajorSort(s=>({field:'name',asc:s.field==='name'?!s.asc:true}))}>
                              专业名称 {majorSort.field==='name' && (majorSort.asc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-2 font-bold text-gray-700 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...majors].sort((a,b)=>{
                            if(majorSort.asc) return a.name.localeCompare(b.name,'zh-CN');
                            else return b.name.localeCompare(a.name,'zh-CN');
                          }).map(m=>(
                            <tr key={m.id} className="border-b last:border-b-0">
                              {editingMajorId===m.id ? (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <Input value={editingMajorName} onChange={e=>setEditingMajorName(e.target.value)} className="w-32" autoFocus onKeyDown={e=>{if(e.key==='Enter')saveEditMajor();if(e.key==='Escape')cancelEditMajor();}} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={saveEditMajor}>保存</button>
                                    <button className="text-gray-500 hover:underline" onClick={cancelEditMajor}>取消</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2 whitespace-nowrap">{m.name}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={()=>startEditMajor(m)}>编辑</button>
                                    <button className="text-red-500 hover:underline" onClick={()=>deleteMajor(m.id)}>删除</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {/* 班级管理 */}
                <div className="md:pl-6 flex flex-col items-start h-full min-h-0 flex-1">
                  <div className="text-xl font-extrabold mb-4 text-gray-800">班级管理</div>
                  <div className="space-y-3 w-full">
                    <Input value={newClass.name} onChange={e=>setNewClass(c=>({...c,name:e.target.value}))} placeholder="班级名，如1班" className="w-full" />
                    <select className="w-full border rounded px-3 py-2" value={newClass.grade_id} onChange={e=>setNewClass(c=>({...c,grade_id:e.target.value}))}>
                      <option value="">选择年级</option>
                      {grades.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}
                    </select>
                    <select className="w-full border rounded px-3 py-2" value={newClass.major_id} onChange={e=>setNewClass(c=>({...c,major_id:e.target.value}))}>
                      <option value="">选择专业</option>
                      {majors.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                    <Button onClick={addClass} className="w-full">添加</Button>
                    <div className="mt-2 flex-1 min-h-0 overflow-y-auto w-full pr-2">
                      <table className="min-w-full text-base text-left border bg-white rounded-xl overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 font-bold text-gray-700 cursor-pointer select-none" onClick={()=>setClassSort(s=>({field:'name',asc:s.field==='name'?!s.asc:true}))}>
                              班级名称 {classSort.field==='name' && (classSort.asc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-2 font-bold text-gray-700 cursor-pointer select-none" onClick={()=>setClassSort(s=>({field:'grade',asc:s.field==='grade'?!s.asc:true}))}>
                              年级 {classSort.field==='grade' && (classSort.asc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-2 font-bold text-gray-700 cursor-pointer select-none" onClick={()=>setClassSort(s=>({field:'major',asc:s.field==='major'?!s.asc:true}))}>
                              专业 {classSort.field==='major' && (classSort.asc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-2 font-bold text-gray-700 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...classes].sort((a,b)=>{
                            let av, bv;
                            if(classSort.field==='name'){ av=a.name; bv=b.name; }
                            else if(classSort.field==='grade'){
                              av=grades.find(g=>g.id===a.grade_id)?.name||'';
                              bv=grades.find(g=>g.id===b.grade_id)?.name||'';
                            }else if(classSort.field==='major'){
                              av=majors.find(m=>m.id===a.major_id)?.name||'';
                              bv=majors.find(m=>m.id===b.major_id)?.name||'';
                            }
                            if(classSort.asc) return String(av).localeCompare(String(bv),'zh-CN');
                            else return String(bv).localeCompare(String(av),'zh-CN');
                          }).map(cls=>{
                            const grade = grades.find(g=>g.id===cls.grade_id);
                            const major = majors.find(m=>m.id===cls.major_id);
                            if(editingClassId===cls.id){
                              return (
                                <tr key={cls.id} className="border-b last:border-b-0">
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <Input value={editingClass.name} onChange={e=>setEditingClass(c=>({...c,name:e.target.value}))} className="w-24" autoFocus onKeyDown={e=>{if(e.key==='Enter')saveEditClass();if(e.key==='Escape')cancelEditClass();}} />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <select className="border rounded px-2 py-1" value={editingClass.grade_id} onChange={e=>setEditingClass(c=>({...c,grade_id:e.target.value}))}>
                                      <option value="">选择年级</option>
                                      {grades.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <select className="border rounded px-2 py-1" value={editingClass.major_id} onChange={e=>setEditingClass(c=>({...c,major_id:e.target.value}))}>
                                      <option value="">选择专业</option>
                                      {majors.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={saveEditClass}>保存</button>
                                    <button className="text-gray-500 hover:underline" onClick={cancelEditClass}>取消</button>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={cls.id} className="border-b last:border-b-0">
                                <td className="px-4 py-2 whitespace-nowrap">{cls.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{grade?.name||'-'}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{major?.name||'-'}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                                  <button className="text-blue-600 hover:underline" onClick={()=>startEditClass(cls)}>编辑</button>
                                  <button className="text-red-500 hover:underline" onClick={()=>deleteClass(cls.id)}>删除</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 递归树组件，SVG美化三角
function TreeView({treeData, expanded, toggleExpand, onSelect, selectedNode, path=[]}:{treeData:any[], expanded:any, toggleExpand:(key:string)=>void, onSelect:(node:any)=>void, selectedNode:any, path?:string[]}) {
  // 生成唯一key
  function getNodeKey(node:any, path:string[]) {
    return node.type + '-' + node.id + '-' + path.join('>');
  }
  if (!treeData || treeData.length === 0) return <div className="text-gray-400 text-sm py-2">暂无数据</div>;
  return (
    <ul className="pl-2">
      {treeData.map(node => {
        const currentPath = [...path, node.name];
        const nodeKey = getNodeKey(node, currentPath);
        // 判断是否高亮：type、id、路径（年级/专业/班级名）都要一致
        let isSelected = false;
        if (selectedNode) {
          if (node.type === 'grade' && selectedNode.type === 'grade' && node.id === selectedNode.id) isSelected = true;
          if (node.type === 'major' && selectedNode.type === 'major' && node.id === selectedNode.id && currentPath[0] === selectedNode.gradeName) isSelected = true;
          if (node.type === 'class' && selectedNode.type === 'class' && node.id === selectedNode.id && currentPath[0] === selectedNode.gradeName && currentPath[1] === selectedNode.majorName) isSelected = true;
        }
        return (
          <li key={nodeKey} className="mb-1">
            <div className={`flex items-center gap-1 group cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 ${isSelected ? 'bg-blue-100' : ''}`}
              onClick={()=>{
                if(node.type==='grade') onSelect({type:'grade',id:node.id,gradeName:node.name});
                if(node.type==='major') onSelect({type:'major',id:node.id,gradeName:currentPath[0],majorName:node.name});
                if(node.type==='class') onSelect({type:'class',id:node.id,gradeName:currentPath[0],majorName:currentPath[1],className:node.name});
              }}>
              {node.children && node.children.length > 0 && (
                <span onClick={e=>{e.stopPropagation();toggleExpand(nodeKey);}} className="w-5 h-5 flex items-center justify-center text-gray-400 select-none">
                  {expanded[nodeKey] ? (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M8 6l4 4-4 4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </span>
              )}
              <span className="flex-1 truncate" title={node.name}>{node.name}</span>
            </div>
            {node.children && node.children.length > 0 && expanded[nodeKey] && (
              <TreeView treeData={node.children} expanded={expanded} toggleExpand={toggleExpand} onSelect={onSelect} selectedNode={selectedNode} path={currentPath} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

// 角色标签组件
function RoleTag({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: '管理员', color: 'bg-gray-300 text-gray-800' },
    student: { label: '学生', color: 'bg-blue-100 text-blue-700' },
    monitor: { label: '班长', color: 'bg-green-100 text-green-700' },
    league_secretary: { label: '团支书', color: 'bg-yellow-100 text-yellow-700' },
    study_committee: { label: '学习委员', color: 'bg-purple-100 text-purple-700' },
  };
  const info = map[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${info.color}`}>{info.label}</span>;
}

// 用户表格组件
function UserTable({users}:{users:any[]}) {
  if (!users || users.length === 0) return <div className="text-gray-400 text-center py-8">暂无用户</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-left bg-white rounded-xl overflow-hidden shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">姓名</th>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">学号</th>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">角色</th>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">年级</th>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">专业</th>
            <th className="border px-4 py-2 font-bold text-gray-700 whitespace-nowrap">班级</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="hover:bg-blue-50 transition">
              <td className="border px-4 py-2 whitespace-nowrap">{u.name}</td>
              <td className="border px-4 py-2 whitespace-nowrap">{u.student_id}</td>
              <td className="border px-4 py-2 whitespace-nowrap"><RoleTag role={u.role} /></td>
              <td className="border px-4 py-2 whitespace-nowrap">{u.grade}</td>
              <td className="border px-4 py-2 whitespace-nowrap">{u.major}</td>
              <td className="border px-4 py-2 whitespace-nowrap">{u.class}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 