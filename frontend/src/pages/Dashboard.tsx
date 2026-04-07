import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, CheckSquare, Clock, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [userName, setUserName] = useState('User');
  const [userAvatar, setUserAvatar] = useState<string | null>(localStorage.getItem('workvia_avatar'));
  const userEmail = localStorage.getItem('workvia_user_email') || '';
  const token = localStorage.getItem('workvia_token') || '';

  // Task detail drawer state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Confirm dialog state (used by drawer)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; isDangerous: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', isDangerous: true, onConfirm: () => {} });

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  // Profile update listener
  useEffect(() => {
    const loadProfile = () => {
      setUserAvatar(localStorage.getItem('workvia_avatar'));
      const storedFirstName = localStorage.getItem('workvia_first_name');
      if (storedFirstName) setUserName(storedFirstName);
    };
    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, []);

  // =========================================================================
  // Data Fetching
  // =========================================================================
  
  // 1. Fetch all projects and tasks
  const { data: dashboardData = { projects: [], tasks: [] } } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      if (!token) return { projects: [], tasks: [] };
      const [pRes, tRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const projects = await pRes.json();
      const tasks = await tRes.json();
      return { 
        projects: Array.isArray(projects) ? projects : [], 
        tasks: Array.isArray(tasks) ? tasks : [] 
      };
    },
    enabled: !!token
  });

  // 2. Fetch chart data
  const { data: barData = [] } = useQuery({
    queryKey: ['chartHistory'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tasks/history/chart`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token
  });

  // 3. Fetch project members when a task is clicked
  const { data: currentProjectMembers = [] } = useQuery({
    queryKey: ['projectMembers', selectedTask?.projectId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${selectedTask.projectId}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
      const members = await res.json();
      return members.map((m: any, index: number) => {
        const colors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-pink-600'];
        const fullName = m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.name || m.user.email;
        return {
          id: m.user.id, name: fullName, email: m.user.email, role: m.role,
          avatarUrl: m.user.avatarUrl, color: colors[index % colors.length], avatar: fullName.substring(0, 2).toUpperCase()
        };
      });
    },
    enabled: !!selectedTask?.projectId
  });

  const selectedTaskRole = currentProjectMembers.find((m: any) => m.email === userEmail)?.role?.toUpperCase() || 'VIEWER';

  // Refresh global data
  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });

  // Derived calculations
  const projects = dashboardData.projects;
  const allTasks = dashboardData.tasks;
  const myTasks = allTasks.filter((t: any) => t.assignee?.email === userEmail);
  const inProgressCount = myTasks.filter((t:any) => t.status?.toUpperCase().includes('PROGRESS')).length;
  
  const now = new Date();
  const projectsThisMonth = projects.filter((p:any) => new Date(p.createdAt).getMonth() === now.getMonth()).length;

  return (
    <>
      <div className="flex h-screen bg-[#f8fafc] dark:bg-[#09090b] font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden transition-colors duration-200">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            
            {/* Header Card */}
            <div className="bg-[#1e1b4b] rounded-2xl p-8 mb-8 relative overflow-hidden text-white shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-purple-200 text-sm font-medium mb-3">
                  <Clock className="w-4 h-4" /> {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                  Welcome back, {userName} <span className="text-2xl">👋</span>
                </h1>
                <p className="text-purple-200">Here's what's happening with your projects today.</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Total Projects</p>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Folder className="w-4 h-4" /></div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{projects.length}</h3>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> +{projectsThisMonth} this month</p>
              </div>
              
              <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">In Progress Tasks</p>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{inProgressCount}</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4" /> Keep it up!</p>
              </div>

              <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Total My Tasks</p>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{myTasks.length}</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">Tasks assigned to you</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Distribution</h3>
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1">
                    <button onClick={() => setChartType('pie')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'pie' ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Pie</button>
                    <button onClick={() => setChartType('bar')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'bar' ? 'bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Bar</button>
                  </div>
                </div>
                <div className="w-full h-[320px] flex items-center justify-center relative">
                   {chartType === 'pie' ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie 
                           data={[
                             { name: 'To Do', value: allTasks.filter((t:any) => t.status?.toUpperCase() === 'TODO' || t.status === 'To Do').length, color: '#a855f7' },
                             { name: 'In Progress', value: allTasks.filter((t:any) => t.status?.toUpperCase().includes('PROGRESS')).length, color: '#3b82f6' },
                             { name: 'Done', value: allTasks.filter((t:any) => t.status?.toUpperCase() === 'DONE' || t.status === 'Done').length, color: '#10b981' }
                           ].filter(item => item.value > 0)} 
                           cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value"
                         >
                           {[
                             { color: '#a855f7' }, { color: '#3b82f6' }, { color: '#10b981' }
                           ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                         </Pie>
                         <RechartsTooltip />
                       </PieChart>
                     </ResponsiveContainer>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                         <RechartsTooltip cursor={{fill: '#f1f5f9', opacity: 0.1}} />
                         <Bar dataKey="ToDo" stackId="a" fill="#a855f7" />
                         <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={24} />
                         <Bar dataKey="InProgress" stackId="a" fill="#3b82f6" />
                       </BarChart>
                     </ResponsiveContainer>
                   )}
                </div>
                <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#a855f7]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    To Do <span className="font-semibold text-gray-900 dark:text-white ml-1">{allTasks.filter((t:any) => t.status?.toUpperCase() === 'TODO' || t.status === 'To Do').length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    In Progress <span className="font-semibold text-gray-900 dark:text-white ml-1">{allTasks.filter((t:any) => t.status?.toUpperCase().includes('PROGRESS')).length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Done <span className="font-semibold text-gray-900 dark:text-white ml-1">{allTasks.filter((t:any) => t.status?.toUpperCase() === 'DONE' || t.status === 'Done').length}</span>
                  </span>
                </div>
              </div>
              </div>

              {/* Recent Tasks List */}
              <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">My Recent Tasks</h3>
                  <button onClick={() => navigate('/tasks')} className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">View all</button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                  {myTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center mt-10">No tasks found.</p>
                  ) : (
                    myTasks.slice(0, 6).map((task: any) => (
                      // Set selected task on card click
                      <div key={task.id} onClick={() => setSelectedTask(task)} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800 cursor-pointer group">
                        <div className="mt-1">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.status?.toUpperCase() === 'DONE' ? 'border-emerald-500' : 'border-blue-500'}`}>
                            {task.status?.toUpperCase() === 'DONE' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'text-red-600 bg-red-50 dark:bg-red-500/10' : 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'}`}>
                            {task.priority || 'Medium'}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mt-1 group-hover:text-purple-600 transition-colors">{task.title}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Drawer component for viewing/editing tasks */}
      <TaskDetailDrawer 
        isOpen={!!selectedTask}
        task={selectedTask}
        projectId={selectedTask?.projectId || ''}
        projectName={selectedTask?.projectName || 'Project'}
        userRole={selectedTaskRole as any}
        projectMembers={currentProjectMembers} 
        currentUserName={userName}
        currentUserEmail={userEmail}
        currentUserAvatar={userAvatar}
        onClose={() => { setSelectedTask(null); refreshAll(); }}
      />

      {/* Confirm dialog for drawer operations */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
        confirmText="Confirm"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}