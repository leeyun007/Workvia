import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Settings, Plus, X, Trello, Users, UserMinus, UserPlus, 
  Sparkles, Bot, Loader2, CheckSquare, Trash2
} from 'lucide-react';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTaskId = searchParams.get('taskId');
  const { toast } = useToast();
  const queryClient = useQueryClient(); 
  const token = localStorage.getItem('workvia_token') || '';
  
  const [activeTab, setActiveTab] = useState<'board' | 'members' | 'settings'>('board');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'Medium' });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [isSavingTasks, setIsSavingTasks] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);

  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDangerous: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDangerous: true,
    onConfirm: () => {},
  });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const userName = localStorage.getItem('workvia_user_name') || 'User';
  const userEmail = localStorage.getItem('workvia_user_email') || '';
  const [userAvatar, setUserAvatar] = useState<string | null>(localStorage.getItem('workvia_avatar'));

  useEffect(() => {
    const handleUpdate = () => setUserAvatar(localStorage.getItem('workvia_avatar'));
    window.addEventListener('profileUpdated', handleUpdate);
    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const { data: currentMembers = [] } = useQuery({
    queryKey: ['projectMembers', projectId], 
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      return data.map((m: any, index: number) => {
        const colors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-pink-600'];
        const fullName = m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.name || m.user.email;
        return {
          id: m.user.id, name: fullName, email: m.user.email, role: m.role,
          avatarUrl: m.user.avatarUrl, jobTitle: m.user.jobTitle || 'No title set',
          bio: m.user.bio || "This user hasn't written a bio yet.",
          avatar: getInitials(fullName), color: colors[index % colors.length], 
          isYou: m.user.email === userEmail
        };
      });
    },
    enabled: !!token && !!projectId 
  });

  const myRole = currentMembers.find((m: any) => m.isYou)?.role?.toUpperCase() || 'VIEWER'; 

  const { data: projectPayload } = useQuery({
    queryKey: ['projectData', projectId],
    queryFn: async () => {
      const [projRes, taskRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const projects = await projRes.json();
      const tasks = await taskRes.json();
      
      const currentProject = projects.find((p: any) => p.id === projectId) || { name: 'Project Not Found', description: '' };
      const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
      
      return { info: currentProject, tasks: projectTasks };
    },
    enabled: !!token && !!projectId
  });

  const projectInfo = projectPayload?.info || { name: 'Loading...', description: '' };
  const allTasks = projectPayload?.tasks || [];
  
  const boardData = { todo: [] as any[], inProgress: [] as any[], done: [] as any[] };
  allTasks.forEach((task: any) => {
    const status = task.status?.toUpperCase() || 'TODO';
    if (status.includes('PROGRESS')) boardData.inProgress.push(task);
    else if (status.includes('DONE')) boardData.done.push(task);
    else boardData.todo.push(task);
  });

  useEffect(() => {
    if (urlTaskId && allTasks.length > 0) {
      const taskToOpen = allTasks.find((t: any) => t.id === urlTaskId);
      if (taskToOpen) {
        setSelectedTask(taskToOpen);
      }
    }
  }, [urlTaskId, allTasks]);

  useEffect(() => {
    if (projectInfo.name !== 'Loading...') {
      setEditProjectName(projectInfo.name);
      setEditProjectDesc(projectInfo.description || '');
    }
  }, [projectInfo.name, projectInfo.description]);

  const refreshProjectData = () => queryClient.invalidateQueries({ queryKey: ['projectData', projectId] });
  const refreshMembersData = () => queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });

  useEffect(() => {
    if (selectedTask) {
      const updatedTask = allTasks.find((t: any) => t.id === selectedTask.id);
      if (updatedTask) setSelectedTask(updatedTask);
    }
  }, [allTasks]);

  const handleSaveManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ projectId, title: newTask.title, description: newTask.description, priority: newTask.priority, status: 'To Do' })
      });
      if (res.ok) { setIsTaskModalOpen(false); setNewTask({ title: '', description: '', priority: 'Medium' }); refreshProjectData(); }
    } catch (err) { console.error(err); }
  };

  const handleAiBreakdown = async () => {
    if (!aiGoal.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: aiGoal })
      });
      if (res.ok) setAiResults(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsAiLoading(false); }
  };

  const handleSaveAiTasks = async () => {
    setIsSavingTasks(true);
    try {
      for (const task of aiResults) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ projectId, ...task, status: 'To Do' })
        });
      }
      setIsAiModalOpen(false); setAiGoal(''); setAiResults([]); refreshProjectData();
    } catch (err) { console.error(err); }
    finally { setIsSavingTasks(false); }
  };

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail })
      });
      if (res.ok) {
        toast('success', 'Member added', 'The member has been added to the project.');
        setInviteEmail('');
        refreshMembersData(); 
      } else {
        const data = await res.json();
        toast('error', 'Failed to add member', data.error || "Unable to add the member.");
      }
    } catch (err) { console.error(err); }
    finally { setIsInviting(false); }
  };

  const executeRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) refreshMembersData(); 
      else toast('error', 'Failed to remove member', "Unable to remove the member.");
    } catch (err) { console.error(err); }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) refreshMembersData(); 
      else {
        const data = await res.json();
        toast('error', 'Failed to update role', data.error || "Failed to update role.");
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectName.trim()) return;
    setIsUpdatingProject(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editProjectName, description: editProjectDesc })
      });
      if (res.ok) {
        toast('success', 'Project updated', 'The project details have been successfully saved.');
        refreshProjectData(); 
        window.dispatchEvent(new Event('projectListUpdated')); 
      } else {
        toast('error', 'Update failed', 'Unable to update the project. Please try again.');
      }
    } catch (err) { console.error(err); }
    finally { setIsUpdatingProject(false); }
  };

  const executeDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast('success', 'Project deleted', 'The project has been successfully deleted.');
        window.dispatchEvent(new Event('projectListUpdated'));
        navigate('/dashboard');
      } else {
        toast('error', 'Failed to delete project', "Unable to delete the project. Please try again.");
        setIsDeleting(false);
      }
    } catch (err) { console.error(err); setIsDeleting(false); }
  };

  return (
    <>
      <div className="flex h-screen bg-[#f8fafc] dark:bg-[#09090b] font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden relative transition-colors duration-200">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="bg-white dark:bg-[#09090b] px-8 pt-8 border-b border-gray-200 dark:border-gray-800 shrink-0 transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{projectInfo.name}</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{projectInfo.description || 'No description provided.'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {currentMembers.map((m: any) => (
                      <div key={m.id} className={`w-8 h-8 rounded-full overflow-hidden ${m.color} border-2 border-white dark:border-[#09090b] flex items-center justify-center text-white text-xs font-bold z-10 relative`}>
                        {m.avatar}
                        {(m.isYou ? userAvatar : m.avatarUrl) && (
                          <img 
                            src={m.isYou ? userAvatar : m.avatarUrl} 
                            alt="Avatar" 
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{currentMembers.length} members</span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-8">
                  <button onClick={() => setActiveTab('board')} className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'board' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Trello className="w-4 h-4" /> Board</button>
                  <button onClick={() => setActiveTab('members')} className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'members' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}><Users className="w-4 h-4" /> Members</button>
                  
                  <button 
                    onClick={() => myRole === 'ADMIN' && setActiveTab('settings')} 
                    className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-colors ${
                      myRole !== 'ADMIN' ? 'opacity-50 cursor-not-allowed text-gray-400 border-transparent' : 
                      activeTab === 'settings' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    title={myRole !== 'ADMIN' ? "Only Admins can access settings" : ""}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
                {activeTab === 'board' && myRole !== 'VIEWER' && (<button onClick={() => setIsAiModalOpen(true)} className="mb-3 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-purple-500/20 transition-all hover:-translate-y-0.5"><Sparkles className="w-4 h-4" /> AI Auto-Breakdown</button>)}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto bg-white dark:bg-[#09090b] p-8 transition-colors duration-200">
            <div className={`mx-auto ${activeTab === 'board' ? 'max-w-none min-w-[1000px]' : 'max-w-4xl'}`}>
              
              {/* ================= Board Tab ================= */}
              {activeTab === 'board' && (
                <div className="flex gap-6 h-full items-start">
                  {['todo', 'inProgress', 'done'].map((statusKey) => (
                    <div key={statusKey} className={`flex-1 min-w-[300px] rounded-2xl p-4 border border-gray-100/50 dark:border-gray-800 ${
                      statusKey === 'todo' ? 'bg-[#f8fafc] dark:bg-[#121214]' : 
                      statusKey === 'inProgress' ? 'bg-[#eff6ff] dark:bg-blue-900/10 dark:border-blue-900/20' : 
                      'bg-[#ecfdf5] dark:bg-emerald-900/10 dark:border-emerald-900/20'
                    }`}>
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusKey === 'todo' ? 'bg-gray-400' : statusKey === 'inProgress' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                          {statusKey === 'todo' ? 'To Do' : statusKey === 'inProgress' ? 'In Progress' : 'Done'} 
                          <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">{(boardData as any)[statusKey].length}</span>
                        </h3>
                        {myRole !== 'VIEWER' && (
                          <button onClick={() => setIsTaskModalOpen(true)} className="text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-500/20 p-1 rounded transition-colors"><Plus className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {(boardData as any)[statusKey].map((task: any) => (
                          <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-[#18181b] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-4 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{task.title}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' : task.priority === 'Low' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'}`}>{task.priority || 'Medium'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ================= Members Tab ================= */}
              {activeTab === 'members' && (
                <div className="max-w-3xl">
                  {myRole === 'ADMIN' && (
                    <div className="mb-10">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><UserPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Add New Member</h3>
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#121214] p-2 rounded-xl border border-gray-100 dark:border-gray-800 focus-within:border-purple-300 dark:focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 dark:focus-within:ring-purple-500/20 transition-all">
                        <input 
                          type="email" 
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                          placeholder="Enter email address..." 
                          className="flex-1 bg-transparent px-4 py-2 outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" 
                        />
                        <button 
                          onClick={handleAddMember}
                          disabled={isInviting || !inviteEmail.trim()}
                          className="bg-[#0f172a] dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white dark:text-gray-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Member'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 dark:bg-[#18181b] text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        <tr><th className="px-6 py-3">Member</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th>
                        {myRole === 'ADMIN' && <th className="px-6 py-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {currentMembers.map((m: any) => (
                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-[#18181b] transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3 cursor-pointer group"
                              onClick={() => setViewingProfile(m)}>
                              <div className={`w-8 h-8 rounded-full overflow-hidden ${m.color} flex items-center justify-center text-white text-xs font-bold relative shrink-0`}>
                                {m.avatar}
                                {(m.isYou ? userAvatar : m.avatarUrl) && (
                                  <img 
                                    src={m.isYou ? userAvatar : m.avatarUrl} 
                                    alt="Avatar" 
                                    className="absolute inset-0 w-full h-full object-cover z-10"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                  />
                                )}
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {m.name} {m.isYou && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(You)</span>}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{m.email}</td>
                            <td className="px-6 py-4">
                              {myRole === 'ADMIN' && !m.isYou ? (
                                <select
                                  value={m.role}
                                  onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                                  className="text-xs font-bold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#121214] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm transition-all"
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="MEMBER">MEMBER</option>
                                  <option value="VIEWER">VIEWER</option>
                                </select>
                              ) : (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10">
                                  {m.role}
                                </span>
                              )}
                            </td>
                            {myRole === 'ADMIN' && (
                              <td className="px-6 py-4 text-right">
                                {!m.isYou && (
                                  <button 
                                    onClick={() => {
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: 'Remove Member',
                                        message: `Are you sure you want to remove ${m.name} from this project?`,
                                        isDangerous: true,
                                        onConfirm: () => executeRemoveMember(m.id)
                                      });
                                    }} 
                                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-semibold flex items-center justify-end gap-1.5 ml-auto transition-colors"
                                  >
                                    <UserMinus className="w-4 h-4" /> Remove
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= Settings Tab ================= */}
              {activeTab === 'settings' && myRole === 'ADMIN' && (
                <div className="max-w-2xl">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">General Settings</h3>
                  <form onSubmit={handleUpdateProject} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
                      <input 
                        type="text" 
                        value={editProjectName} 
                        onChange={(e) => setEditProjectName(e.target.value)}
                        required
                        className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                      <textarea 
                        rows={4} 
                        value={editProjectDesc} 
                        onChange={(e) => setEditProjectDesc(e.target.value)}
                        className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isUpdatingProject || !editProjectName.trim()}
                      className="bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isUpdatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </form>

                  <div className="mt-16 pt-8 border-t border-red-100 dark:border-red-900/30">
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                      <Trash2 className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Once you delete a project, all of its tasks, members, and attachments will be permanently removed. This action cannot be undone.
                    </p>
                    <button 
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Delete Project',
                          message: `DANGER: Are you sure you want to delete "${projectInfo.name}"? This action cannot be undone.`,
                          isDangerous: true,
                          onConfirm: executeDeleteProject
                        });
                      }}
                      disabled={isDeleting}
                      className="bg-red-50 dark:bg-red-500/10 hover:bg-red-500 dark:hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-100 dark:border-transparent hover:border-red-500 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Project'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <TaskDetailDrawer 
            isOpen={!!selectedTask}
            task={selectedTask}
            projectId={projectId || ''}
            projectName={projectInfo.name}
            userRole={myRole as any}
            projectMembers={currentMembers} 
            currentUserName={userName}
            currentUserEmail={userEmail}
            currentUserAvatar={userAvatar}
            onClose={() => {
              setSelectedTask(null);
              if (urlTaskId) {
                searchParams.delete('taskId');
                setSearchParams(searchParams, { replace: true });
              }
            }}
          />

          {/* ================= Create Task Modal ================= */}
          {isTaskModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsTaskModalOpen(false)}></div>
              
              <div className="bg-white dark:bg-[#121214] border border-transparent dark:border-gray-800 rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10 shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Create Task</h2>
                  <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors shadow-sm border border-gray-100 dark:border-gray-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveManualTask} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Task Title</label>
                    <input type="text" placeholder="e.g. Develop login module" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                    <textarea rows={2} value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all" placeholder="Add details..."></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project</label>
                      <input value={projectInfo.name} disabled className="w-full bg-gray-50 dark:bg-[#18181b] text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                      <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})} className="w-full bg-white dark:bg-[#09090b] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={!newTask.title.trim()} className="bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors">
                      Create Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= AI Modal ================= */}
          {isAiModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAiModalOpen(false)}></div>
              <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh] relative z-10 border border-transparent dark:border-gray-800">
                <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-500/20 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Bot className="w-5 h-5" />
                    <h3 className="text-lg font-bold">AI Auto-Breakdown</h3>
                  </div>
                  <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  {aiResults.length === 0 ? (
                    <>
                      <div className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 p-4 rounded-xl text-sm mb-6 border border-purple-100 dark:border-purple-500/20 flex gap-3">
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <p>Describe your goal, and AI will break it down into actionable tasks.</p>
                      </div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What do you want to build?</label>
                      <textarea rows={4} value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} placeholder="e.g. Build a user login system..." className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none shadow-sm" />
                      <div className="mt-6 flex justify-end">
                        <button onClick={handleAiBreakdown} disabled={!aiGoal.trim() || isAiLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-all hover:-translate-y-0.5">
                          {isAiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Tasks</>}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-500" /> AI Generated <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{aiResults.length}</span></h4>
                        <button onClick={() => setAiResults([])} className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">Start over</button>
                      </div>
                      <div className="space-y-3">
                        {aiResults.map((t, i) => (
                          <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-[#18181b] shadow-sm hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors">
                            <div className="flex justify-between gap-4 mb-2">
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm">{t.title}</h5>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${t.priority === 'High' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' : t.priority === 'Low' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'}`}>{t.priority || 'Medium'}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#121214] pt-4 border-t border-gray-50 dark:border-gray-800/50">
                        <button onClick={() => setIsAiModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleSaveAiTasks} disabled={isSavingTasks} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-colors">
                          {isSavingTasks ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add All to Board'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= Profile Card Modal ================= */}
          {viewingProfile && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setViewingProfile(null)}></div>
              
              <div className="bg-white dark:bg-[#121214] border border-transparent dark:border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10 shadow-2xl flex flex-col items-center p-8 text-center">
                <button onClick={() => setViewingProfile(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-50 dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>

                <div className={`w-24 h-24 rounded-full overflow-hidden ${viewingProfile.color} border-4 border-white dark:border-[#18181b] shadow-lg flex items-center justify-center text-white text-3xl font-bold mb-4 relative`}>
                  {viewingProfile.avatar}
                  {(viewingProfile.isYou ? userAvatar : viewingProfile.avatarUrl) && (
                    <img 
                      src={viewingProfile.isYou ? userAvatar : viewingProfile.avatarUrl} 
                      alt="Profile" 
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                    />
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                  {viewingProfile.name}
                </h2>
                <p className="text-purple-600 dark:text-purple-400 font-semibold text-sm mt-1 mb-6">
                  {viewingProfile.jobTitle}
                </p>

                <div className="flex gap-2 justify-center w-full mb-6">
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full font-medium">
                    {viewingProfile.email}
                  </span>
                  <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs px-3 py-1 rounded-full font-bold">
                    {viewingProfile.role}
                  </span>
                </div>

                <div className="w-full bg-gray-50 dark:bg-[#18181b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-left">About Me</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-left leading-relaxed whitespace-pre-wrap">
                    {viewingProfile.bio}
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
        confirmText={confirmDialog.isDangerous ? "Yes, delete it" : "Confirm"}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}