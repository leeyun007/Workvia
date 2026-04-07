import { useState, useEffect } from 'react';
import { 
  Plus, X, Activity, Calendar, Circle, CheckCircle2, 
  Loader2, ChevronDown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog'; 
import { useToast } from '../contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function MyTasks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient(); 
  const token = localStorage.getItem('workvia_token') || '';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilterProject, setSelectedFilterProject] = useState<string>('ALL');
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
  const [selectedFilterPriority, setSelectedFilterPriority] = useState<string>('ALL');
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<any | null>(null); 
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');

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
    const token = localStorage.getItem('workvia_token');
    if (!token) {
      navigate('/login');
      return;
    }
  }, [navigate]);

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

  const { data: projectData = { list: [], roles: {} } } = useQuery({
    queryKey: ['projectsWithRoles'],
    queryFn: async () => {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      const projs = await res.json();
      
      const rolesDict: Record<string, string> = {};
      await Promise.all(projs.map(async (p: any) => {
        try {
          const rRes = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${p.id}/members`, { headers: { Authorization: `Bearer ${token}` } });
          if (rRes.ok) {
            const members = await rRes.json();
            const me = members.find((m: any) => m.user.email === userEmail);
            rolesDict[p.id] = me ? me.role.toUpperCase() : 'VIEWER';
          } else {
            rolesDict[p.id] = 'VIEWER';
          }
        } catch { rolesDict[p.id] = 'VIEWER'; }
      }));
      
      return { list: projs, roles: rolesDict };
    },
    enabled: !!token
  });

  const projects = projectData.list;
  const projectRoles = projectData.roles;

  useEffect(() => {
    if (!newTaskProjectId && projects.length > 0) {
      const writable = projects.find((p: any) => projectRoles[p.id] !== 'VIEWER');
      setNewTaskProjectId(writable ? writable.id : projects[0].id);
    }
  }, [projects, projectRoles]);

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const myPersonalTasks = data.filter((task: any) => task.assignee?.email === userEmail);
      return myPersonalTasks.map((task: any) => {
        let formattedDate = 'No Date';
        let frontendStatus = 'upcoming';

        if (task.dueDate) {
          const dateObj = new Date(task.dueDate);
          formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (dateObj < today && task.status?.toUpperCase() !== 'DONE') {
            formattedDate += ' (Overdue)';
            frontendStatus = 'overdue';
          }
        }
        if (task.status?.toUpperCase() === 'DONE') frontendStatus = 'completed';
        const formatPriority = task.priority ? task.priority.charAt(0) + task.priority.slice(1).toLowerCase() : 'Medium';
        const projectColor = task.projectName?.includes('CampusTalk') ? '#a855f7' : '#3b82f6';

        return {
          id: task.id, displayId: task.id.substring(0, 8).toUpperCase(), title: task.title,
          project: task.projectName || 'Unknown Project', projectId: task.projectId || '', projectColor,
          priority: formatPriority, dueDate: formattedDate, rawDueDate: task.dueDate,
          status: frontendStatus, rawStatus: task.status || 'To Do', description: task.description,
          assignee: task.assignee?.avatarUrl || '?', rawAssignee: task.assignee, comments: task.comments || [] 
        };
      });
    },
    enabled: !!token
  });

  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t: any) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  const { data: currentProjectMembers = [] } = useQuery({
    queryKey: ['projectMembers', selectedTask?.projectId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${selectedTask.projectId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      const members = await res.json();
      return members.map((m: any, index: number) => {
        const colors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-pink-600'];
        const fullName = m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.name || m.user.email;
        return {
          id: m.user.id, name: fullName, email: m.user.email, role: m.role,
          avatarUrl: m.user.avatarUrl, color: colors[index % colors.length], avatar: getInitials(fullName)
        };
      });
    },
    enabled: !!token && !!selectedTask?.projectId
  });

  const selectedTaskRole = currentProjectMembers.find((m: any) => m.email === userEmail)?.role?.toUpperCase() || 'VIEWER';

  const createTaskMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDescription, priority: newTaskPriority, projectId: newTaskProjectId, status: 'To Do' })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
      setIsModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('Medium');
    },
    onError: (err: any) => toast('error', 'Failed to create task', err.message)
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjectId) return; 
    if (projectRoles[newTaskProjectId] === 'VIEWER') {
      toast('warning', 'Access Denied', 'You are a VIEWER in this project and cannot create tasks.');
      return;
    }
    createTaskMut.mutate();
  };

  const projectFilteredTasks = tasks.filter((t: any) => selectedFilterProject === 'ALL' || t.projectId === selectedFilterProject);
  const priorityFilteredTasks = projectFilteredTasks.filter((t: any) => selectedFilterPriority === 'ALL' || t.priority === selectedFilterPriority);
  const filteredTasks = priorityFilteredTasks.filter((task: any) => task.status === activeTab);
  
  const upcomingCount = priorityFilteredTasks.filter((t: any) => t.status === 'upcoming').length;
  const overdueCount = priorityFilteredTasks.filter((t: any) => t.status === 'overdue').length;
  const completedCount = priorityFilteredTasks.filter((t: any) => t.status === 'completed').length;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#09090b] relative h-full transition-colors duration-200">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Tasks</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">All tasks assigned to you across every project, in one place.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6 transition-colors duration-200">
            <button onClick={() => setActiveTab('upcoming')} className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <Calendar className="w-4 h-4" /> Upcoming <span className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">{upcomingCount}</span>
            </button>
            <button onClick={() => setActiveTab('overdue')} className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overdue' ? 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <Activity className="w-4 h-4" /> Overdue <span className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">{overdueCount}</span>
            </button>
            <button onClick={() => setActiveTab('completed')} className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'completed' ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <CheckCircle2 className="w-4 h-4" /> Completed <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs">{completedCount}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <div className="relative">
                <button 
                  onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#121214] transition-colors bg-white dark:bg-[#121214] shadow-sm"
                >
                  <span className="text-gray-400 dark:text-gray-500 font-bold">#</span> 
                  Project: {selectedFilterProject === 'ALL' ? 'All Projects' : projects.find((p: any) => p.id === selectedFilterProject)?.name || 'Unknown'} 
                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isProjectFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProjectFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsProjectFilterOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#18181b] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                      <button 
                        onClick={() => { setSelectedFilterProject('ALL'); setIsProjectFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${selectedFilterProject === 'ALL' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                      >
                        All Projects
                      </button>
                      {projects.map((p: any) => (
                        <button 
                          key={p.id}
                          onClick={() => { setSelectedFilterProject(p.id); setIsProjectFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${selectedFilterProject === p.id ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsPriorityFilterOpen(!isPriorityFilterOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#121214] transition-colors bg-white dark:bg-[#121214] shadow-sm"
                >
                  <span className="text-gray-400 dark:text-gray-500 font-bold">⚡</span> 
                  Priority: {selectedFilterPriority === 'ALL' ? 'All' : selectedFilterPriority} 
                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isPriorityFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPriorityFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsPriorityFilterOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-[#18181b] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                      {['ALL', 'High', 'Medium', 'Low'].map(priority => (
                        <button 
                          key={priority}
                          onClick={() => { setSelectedFilterPriority(priority); setIsPriorityFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${selectedFilterPriority === priority ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                        >
                          {priority === 'ALL' ? 'All Priorities' : priority}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{filteredTasks.length} tasks</span>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#121214] transition-colors duration-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <div className="col-span-6">Task</div>
              <div className="col-span-3">Project</div>
              <div className="col-span-1 text-center">Priority</div>
              <div className="col-span-2 text-right">Due Date</div>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-800 min-h-[200px]">
              {isTasksLoading ? (
                <div className="flex justify-center items-center h-48 text-gray-400 dark:text-gray-500 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Connecting to Database...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex justify-center items-center h-48 text-gray-400 dark:text-gray-500 text-sm font-medium">
                  No tasks found in this category.
                </div>
              ) : (
                filteredTasks.map((task: any) => (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors group">
                    <div className="col-span-6 flex items-center gap-4">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-purple-500 dark:group-hover:text-purple-400 shrink-0 transition-colors" />
                      )}
                      <span className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.projectColor }}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{task.project}</span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' : 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <span className={`text-sm flex items-center gap-1.5 whitespace-nowrap ${task.status === 'overdue' ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Calendar className="w-4 h-4" /> {task.dueDate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <TaskDetailDrawer 
          isOpen={!!selectedTask}
          task={selectedTask}
          projectId={selectedTask?.projectId || ''}
          projectName={selectedTask?.project || 'Unknown'}
          userRole={selectedTaskRole as any} 
          projectMembers={currentProjectMembers} 
          currentUserName={userName}
          currentUserEmail={userEmail}
          currentUserAvatar={userAvatar}
          onClose={() => setSelectedTask(null)}
        />

        {isModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            
            <div className="bg-white dark:bg-[#121214] border border-transparent dark:border-gray-800 rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10 shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Create Task</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-white dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors shadow-sm border border-gray-100 dark:border-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Task Title</label>
                  <input type="text" placeholder="e.g. Develop login module" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea rows={2} value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder="Add details..."></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project</label>
                    <select 
                      value={newTaskProjectId} 
                      onChange={(e) => setNewTaskProjectId(e.target.value)} 
                      className="w-full bg-white dark:bg-[#09090b] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none"
                    >
                      {projects.map((p: any) => (
                         <option 
                           key={p.id} 
                           value={p.id} 
                           disabled={projectRoles[p.id] === 'VIEWER'} 
                         >
                           {p.name} {projectRoles[p.id] === 'VIEWER' ? '(Viewer Only)' : ''}
                         </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                    <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="w-full bg-white dark:bg-[#09090b] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={createTaskMut.isPending || !newTaskTitle.trim()} className="bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    {createTaskMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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