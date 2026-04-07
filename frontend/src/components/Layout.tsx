import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Bell, LayoutDashboard, ListTodo, Settings, LogOut, 
  ChevronDown, ChevronRight, PanelLeft, PanelRight, Plus, X, FolderPlus,
  MessageSquare, UserPlus, AlertCircle, CheckCircle2, Moon, Sun, Circle 
} from 'lucide-react';
import Logo from '../components/Logo';
import { Client } from '@stomp/stompjs';
import { useToast } from '../contexts/ToastContext';
import { useQuery } from '@tanstack/react-query';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const stompClientRef = useRef<Client | null>(null);
  const { toast } = useToast();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('workvia_theme') === 'dark';
  });

  useEffect(() => {
    const loadProfile = () => {
      const storedName = localStorage.getItem('workvia_user_name');
      const storedEmail = localStorage.getItem('workvia_user_email');
      const storedAvatar = localStorage.getItem('workvia_avatar');

      if (storedName) setUserName(storedName);
      if (storedEmail) setUserEmail(storedEmail);
      setAvatarUrl(storedAvatar ? storedAvatar : null);
    };

    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);

    const token = localStorage.getItem('workvia_token'); 
    
    if (token) {
      fetchProjects();
      fetchNotifications();
      
      if (!stompClientRef.current || !stompClientRef.current.active) {
        connectWebSocket(token);
      }
    }

   const handleProjectUpdate = () => fetchProjects();
    window.addEventListener('projectListUpdated', handleProjectUpdate);

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      window.removeEventListener('projectListUpdated', handleProjectUpdate);
      window.removeEventListener('profileUpdated', loadProfile);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.code === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
      localStorage.setItem('workvia_theme', 'dark');
    } else {
      htmlElement.classList.remove('dark');
      localStorage.setItem('workvia_theme', 'light');
    }
  }, [isDarkMode]);

  // Fetch all tasks for global search (lazy loaded for performance)
  const { data: allTasks = [] } = useQuery({
    queryKey: ['globalSearchTasks'],
    queryFn: async () => {
      const token = localStorage.getItem('workvia_token');
      if (!token) return [];
      const res = await fetch('http://localhost:8080/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: isSearchOpen 
  });

  const fetchNotifications = async () => {
    const token = localStorage.getItem('workvia_token');
    try {
      const res = await fetch('http://localhost:8080/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotifications(await res.json());
    } catch (err) { console.error("Failed to fetch notifications", err); }
  };

  const connectWebSocket = (token: string) => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message) => {
          const newNotif = JSON.parse(message.body);
          setNotifications((prev) => [newNotif, ...prev]);
        });
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
      }
    });

    client.activate();
    stompClientRef.current = client;
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('workvia_token');
    try {
      const res = await fetch('http://localhost:8080/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      }
    } catch (err) { console.error(err); }
  };

  const getNotifStyle = (type: string) => {
    switch(type?.toUpperCase()) {
      case 'ASSIGNED': return { icon: CheckCircle2, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' };
      case 'MENTION': return { icon: MessageSquare, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' };
      case 'SYSTEM': 
      case 'URGENT': return { icon: AlertCircle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' };
      case 'TEAM': return { icon: UserPlus, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
      default: return { icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
    }
  };

  const fetchProjects = async () => {
    const token = localStorage.getItem('workvia_token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8080/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProjects(await res.json());
    } catch (err) { console.error(err); }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.clear();
    navigate('/login');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    const token = localStorage.getItem('workvia_token');
    
    try {
      const res = await fetch('http://localhost:8080/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });

      if (res.ok) {
        setNewProjectName('');
        setNewProjectDesc('');
        
        setIsModalOpen(false);
        fetchProjects(); 
      } else {
       toast('error', 'Failed to create project', "Unable to create the project. Please try again.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute filtered search results
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTasks = allTasks.filter((t: any) => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.projectName && t.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#09090b] font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden relative transition-colors duration-200">
      
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-gray-800 flex-col justify-between hidden md:flex transition-all duration-300 z-20 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div>
          <div className={`h-16 flex items-center border-b border-gray-100 dark:border-gray-800 ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
            {isCollapsed ? (
              <button onClick={() => setIsCollapsed(false)} className="group relative flex items-center justify-center w-full h-full hover:bg-gray-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer" title="Expand Sidebar">
                <div className="absolute transition-opacity duration-200 group-hover:opacity-0 transform scale-[0.8] flex items-center justify-center">
                  <Logo variant="colored" showText={false} />
                </div>
                <PanelRight className="absolute w-5 h-5 text-gray-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </button>
            ) : (
              <>
                <div className="transform scale-[0.8] origin-left transition-all overflow-hidden whitespace-nowrap flex items-center w-auto">
                  <Logo variant="colored" showText={false} />
                </div>
                <button onClick={() => setIsCollapsed(true)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#18181b] rounded-lg transition-colors">
                  <PanelLeft className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          <div className={`py-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {!isCollapsed && <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-4 px-2 uppercase">Overview</p>}
            <nav className="space-y-2">
              <Link to="/dashboard" className={`flex items-center text-sm rounded-lg font-medium transition-colors ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} ${location.pathname === '/dashboard' ? 'bg-[#0f172a] dark:bg-purple-500/20 text-white dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#18181b]'}`}>
                <LayoutDashboard className="w-5 h-5 shrink-0" /> 
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
              <Link to="/tasks" className={`flex items-center text-sm rounded-lg font-medium transition-colors ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} ${location.pathname === '/tasks' ? 'bg-[#0f172a] dark:bg-purple-500/20 text-white dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#18181b]'}`}>
                <ListTodo className="w-5 h-5 shrink-0" /> 
                {!isCollapsed && <span>My Tasks</span>}
              </Link>
            </nav>

            {!isCollapsed && (
              <div className="mt-8">
                <div className="flex items-center justify-between px-2 mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">Projects</p>
                  <button onClick={() => setIsModalOpen(true)} className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-500/10">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => setIsProjectsExpanded(!isProjectsExpanded)} 
                    className="w-full flex items-center justify-between text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#18181b] px-3 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {isProjectsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} 
                      All Projects
                    </div>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs py-0.5 px-2 rounded-full">{projects.length}</span>
                  </button>
                  
                  {isProjectsExpanded && (
                    <div className="pl-6 space-y-1 mt-1 max-h-[300px] overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-200">
                      {projects.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 py-2 italic">No projects yet.</p>
                      ) : (
                        projects.map((project, index) => {
                          const colors = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500'];
                          const colorClass = colors[index % colors.length];
                          const isActive = location.pathname.includes(`/projects/${project.id}`);
                          return (
                            <Link 
                              key={project.id} 
                              to={`/projects/${project.id}`} 
                              className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#18181b]'}`}
                            >
                              <span className="truncate flex items-center gap-2">
                                {!isActive && <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>}
                                # {project.name}
                              </span>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div>}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col ${isCollapsed ? 'items-center gap-3' : 'gap-1'}`}>
          <Link to="/settings" className={`flex items-center text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#18181b] rounded-lg font-medium transition-colors ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}`}>
            <Settings className="w-5 h-5 shrink-0" /> {!isCollapsed && <span>Settings</span>}
          </Link>
          
          <button onClick={handleLogout} className={`flex items-center w-full text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg font-medium transition-colors mb-2 ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 mb-4'}`}>
            <LogOut className="w-5 h-5 shrink-0" /> {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        <header className="h-16 bg-white dark:bg-[#121214] border-b border-gray-200 dark:border-gray-800 flex items-center px-6 shrink-0 transition-colors duration-300">
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md group">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
              <input 
                type="text" 
                readOnly
                onClick={() => setIsSearchOpen(true)}
                placeholder="Search tasks, projects..." 
                className="w-full bg-[#f1f5f9] dark:bg-[#18181b] border border-transparent focus:border-purple-200 dark:focus:border-purple-500/50 rounded-lg pl-10 pr-16 py-2 text-sm outline-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 pointer-events-none">
                <kbd className="hidden sm:inline-block border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#18181b] rounded px-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 shadow-sm">Ctrl</kbd>
                <kbd className="hidden sm:inline-block border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#18181b] rounded px-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 shadow-sm">K</kbd>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-4 w-1/3 relative">
            
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative p-2 rounded-lg transition-colors ${isNotifOpen ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#18181b]'}`}
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => n.read === false || n.isRead === false) && (
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-[#121214] rounded-full"></span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
                <div className="absolute top-12 right-12 w-80 bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                    <button onClick={markAllAsRead} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">Mark all as read</button>
                  </div>
                  
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">All caught up! 🎉</div>
                    ) : (
                      notifications.map((notif) => {
                        const style = getNotifStyle(notif.type);
                        const Icon = style.icon;
                        const isRead = notif.read || notif.isRead;
                        return (
                          <div key={notif.id} className={`p-4 border-b border-gray-50 dark:border-gray-800/50 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${isRead ? 'opacity-60' : 'bg-white dark:bg-transparent'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                              <Icon className={`w-4 h-4 ${style.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{notif.message}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">{new Date(notif.createdAt).toLocaleDateString()}</p>
                            </div>
                            {!isRead && <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5"></div>}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="relative">
              <div 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm cursor-pointer border-2 border-white dark:border-[#121214] ring-2 ring-gray-100 dark:ring-gray-800 hover:ring-purple-200 dark:hover:ring-purple-500/50 transition-all overflow-hidden select-none"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => {
                    setAvatarUrl(null); 
                    localStorage.removeItem('workvia_avatar');
                  }}/>
                ) : (
                  getInitials(userName)
                )}
              </div>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  
                  <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#18181b] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(userName)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link 
                        to="/settings" 
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      
                      <button 
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                        onClick={() => { 
                          setIsDarkMode(!isDarkMode); 
                          setIsUserMenuOpen(false);   
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />} 
                          Theme
                        </div>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          {isDarkMode ? 'Light' : 'Dark'}
                        </span>
                      </button>
                    </div>

                    <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                      <button 
                        onClick={(e) => { setIsUserMenuOpen(false); handleLogout(e); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                    
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        <Outlet />

      </main>

      {/* Modal (Create Project) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#121214] border border-transparent dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Project</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g., Workvia Redesign" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-gray-50 dark:bg-[#09090b] focus:bg-white dark:focus:bg-[#18181b]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description <span className="text-gray-400 dark:text-gray-500 font-normal">(Optional)</span></label>
                  <textarea rows={3} placeholder="What is this project about?" value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none bg-gray-50 dark:bg-[#09090b] focus:bg-white dark:focus:bg-[#18181b]"></textarea>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting || !newProjectName.trim()} className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Search Modal (Ctrl+K) */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-slate-900/50 backdrop-blur-sm transition-all" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-white dark:bg-[#121214] rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-200/50 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center px-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121214]">
              <Search className="w-5 h-5 text-purple-500 dark:text-purple-400 shrink-0" />
              <input autoFocus type="text" placeholder="Search projects, tasks, or jump to pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none px-4 py-4 text-[15px] outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 font-medium" />
              <kbd className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#18181b] shrink-0 shadow-sm">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2 bg-[#f8fafc] dark:bg-[#09090b]">
              
              {/* Navigation Items */}
              {(searchQuery === '' || 'dashboard tasks settings create project logout'.includes(searchQuery.toLowerCase())) && (
                <div className="mb-4">
                  <p className="px-3 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Navigation & Actions</p>
                  <div className="space-y-0.5">
                    {('dashboard'.includes(searchQuery.toLowerCase())) && (
                      <button onClick={() => { navigate('/dashboard'); setIsSearchOpen(false); setSearchQuery(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group">
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#18181b] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400"><LayoutDashboard className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Go to Dashboard</span>
                      </button>
                    )}
                    {('tasks todo'.includes(searchQuery.toLowerCase())) && (
                      <button onClick={() => { navigate('/tasks'); setIsSearchOpen(false); setSearchQuery(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group">
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#18181b] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400"><ListTodo className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Go to My Tasks</span>
                      </button>
                    )}
                    {('settings profile security'.includes(searchQuery.toLowerCase())) && (
                      <button onClick={() => { navigate('/settings'); setIsSearchOpen(false); setSearchQuery(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group">
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#18181b] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400"><Settings className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Go to Settings</span>
                      </button>
                    )}
                    {('create new project build'.includes(searchQuery.toLowerCase())) && (
                      <button onClick={() => { setIsModalOpen(true); setIsSearchOpen(false); setSearchQuery(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group">
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#18181b] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400"><FolderPlus className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Create New Project...</span>
                      </button>
                    )}
                    {('logout sign out exit'.includes(searchQuery.toLowerCase())) && (
                      <button onClick={(e) => { handleLogout(e); setIsSearchOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#18181b] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-red-100 dark:group-hover:bg-red-500/20 group-hover:text-red-600 dark:group-hover:text-red-400"><LogOut className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400">Logout</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Projects Results */}
              {filteredProjects.length > 0 && (
                <div className="mb-4">
                  <p className="px-3 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Projects</p>
                  <div className="space-y-0.5">
                    {filteredProjects.map(project => (
                        <button 
                          key={project.id} 
                          onClick={() => { navigate(`/projects/${project.id}`); setIsSearchOpen(false); setSearchQuery(''); }} 
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-sm group-hover:border-purple-200 dark:group-hover:border-purple-500/50 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:shadow">#</div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{project.name}</span>
                        </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Results */}
              {filteredTasks.length > 0 && searchQuery !== '' && (
                <div className="mb-4">
                  <p className="px-3 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tasks</p>
                  <div className="space-y-0.5">
                    {filteredTasks.slice(0, 10).map((task: any) => (
                        <button 
                          key={task.id} 
                          // Navigate to project with taskId query param
                          onClick={() => { 
                            navigate(`/projects/${task.projectId}?taskId=${task.id}`); 
                            setIsSearchOpen(false); 
                            setSearchQuery(''); 
                          }} 
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors group cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-500/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:shadow">
                            <Circle className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate w-full text-left">{task.title}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-left">in {task.projectName}</span>
                          </div>
                        </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchQuery !== '' && 
               !('dashboard tasks todo settings profile security create new project build logout sign out exit'.includes(searchQuery.toLowerCase())) && 
               filteredProjects.length === 0 && 
               filteredTasks.length === 0 && (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">No results found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">We couldn't find anything matching "{searchQuery}"</p>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50/80 dark:bg-gray-800/30 px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">Search or jump to...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}