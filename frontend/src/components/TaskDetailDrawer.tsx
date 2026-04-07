import { useState, useRef } from 'react';
import { ChevronDown, X, AlignLeft, Activity, Paperclip, Smile, Calendar, User, FileText, Download, Trash2, Edit3, Loader2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useToast } from '../contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  task: any | null;
  projectId: string; // Required to invalidate specific project data
  projectName: string;
  userRole: 'ADMIN' | 'MEMBER' | 'VIEWER';
  projectMembers: any[];
  currentUserName: string;
  currentUserEmail: string;
  currentUserAvatar: string | null;
  onClose: () => void;
}

export default function TaskDetailDrawer({
  isOpen, task, projectId, projectName, userRole, projectMembers, currentUserName, currentUserEmail, currentUserAvatar, onClose
}: TaskDetailDrawerProps) {

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // Controls the custom confirmation dialog state
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
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<any | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentValue, setEditCommentValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const token = localStorage.getItem('workvia_token') || '';

  // =========================================================================
  // Mutations
  // =========================================================================

  // Invalidate project and task data globally
  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: ['projectData', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] }); 
  };

  const updateStatusMut = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: invalidateData
  });

  const updateTitleMut = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle })
      });
      if (!res.ok) throw new Error('Failed to update title');
      return res.json();
    },
    onSuccess: invalidateData
  });

  const updateDetailsMut = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update details');
      }
      return res.json();
    },
    onSuccess: invalidateData,
    onError: (err) => toast('error', 'Update failed', err.message)
  });

  const deleteTaskMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete task');
    },
    onSuccess: () => {
      invalidateData();
      onClose(); 
      toast('success', 'Task Deleted', 'The task has been successfully removed.');
    },
    onError: () => toast('error', 'Delete failed', 'You might not have permission.')
  });

  const postCommentMut = useMutation({
    mutationFn: async ({ content, attachment }: { content: string, attachment: any }) => {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: content || '', attachment })
      });
      if (!res.ok) throw new Error('Failed to post comment');
      return res.json();
    },
    onSuccess: () => {
      invalidateData();
      setCommentText(''); 
      setPendingAttachment(null);
    }
  });

  const updateCommentMut = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string, content: string }) => {
      const res = await fetch(`http://localhost:8080/api/tasks/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }) 
      });
      if (!res.ok) throw new Error('Failed to update comment');
      return res.json();
    },
    onSuccess: () => {
      invalidateData();
      setEditingCommentId(null);
    }
  });

  const deleteCommentMut = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`http://localhost:8080/api/tasks/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete comment');
    },
    onSuccess: invalidateData
  });

  const removeAttachmentMut = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`http://localhost:8080/api/tasks/comments/${commentId}/attachment`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove attachment');
    },
    onSuccess: invalidateData
  });

  const uploadFileMut = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload file to S3');
      }
      return res.json();
    },
    onError: (err) => {
      toast('error', 'Upload Failed', err.message);
    }
  });


  // ================= Derived State =================

  if (!isOpen || !task) return null;

  const displayStatus = task.rawStatus !== undefined ? task.rawStatus : task.status;
  const displayDueDate = task.rawDueDate !== undefined ? task.rawDueDate : task.dueDate;
  const displayAssignee = task.rawAssignee !== undefined ? task.rawAssignee : task.assignee;

  const canEditTask = userRole === 'ADMIN' || (displayAssignee && displayAssignee.email === currentUserEmail);

  const getCommentAuthorName = (comment: any) => {
    if (comment.user?.firstName) return `${comment.user.firstName} ${comment.user.lastName}`;
    if (comment.user?.name) return comment.user.name;
    if (comment.user?.email) return comment.user.email;
    return 'Unknown User';
  };
  
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ================= UI Handlers =================

  const handleTitleSubmit = () => {
    if (editTitleValue.trim() && editTitleValue !== task.title) {
      updateTitleMut.mutate(editTitleValue);
    }
    setIsEditingTitle(false);
  };

  // Force file download handler
  const handleForceDownload = async (url: string, filename: string) => {
    try {
      toast('success', 'Downloading...', 'Your file is downloading.');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const attachment = await uploadFileMut.mutateAsync(file);
      if (attachment) setPendingAttachment(attachment);
    } catch (error) {
      console.error("Upload error caught:", error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim() && !pendingAttachment) return;
    postCommentMut.mutate({ content: commentText, attachment: pendingAttachment });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9]*)$/);

    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionCursorIndex(match.index !== undefined ? match.index : null);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (memberName: string) => {
    if (mentionCursorIndex === null) return;
    const before = commentText.slice(0, mentionCursorIndex);
    const after = commentText.slice(mentionCursorIndex + (mentionQuery ? mentionQuery.length : 0) + 1);
    setCommentText(`${before}@${memberName} ${after}`);
    setMentionQuery(null);
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60 z-40 transition-opacity" onClick={() => { onClose(); setIsEditingTitle(false); }}></div>
      <div className={`absolute top-0 right-0 h-full w-[500px] bg-white dark:bg-[#121214] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* === Header === */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-bold px-2 py-1 rounded truncate max-w-[120px]">{projectName}</span>
            <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">TASK-{task.displayId || task.id?.substring(0, 4).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative mr-1">
              <button 
                disabled={!canEditTask || updateStatusMut.isPending}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border shadow-sm ${!canEditTask ? 'opacity-70 cursor-not-allowed' : ''} ${
                  displayStatus === 'Done' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 
                  displayStatus === 'In Progress' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 
                  'bg-white dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${displayStatus === 'Done' ? 'bg-emerald-500' : displayStatus === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'}`}></span>
                {updateStatusMut.isPending ? 'Updating...' : displayStatus} 
                {canEditTask && <ChevronDown className="w-4 h-4 opacity-50 ml-1" />}
              </button>
              {isStatusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#18181b] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1.5 z-50">
                    {['To Do', 'In Progress', 'Done'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => { 
                          if ((s === 'In Progress' || s === 'Done') && !displayAssignee) {
                            toast('warning', 'Assignee Required', 'This task must have an Assignee before it can be moved to In Progress or Done.');
                            return;
                          }
                          updateStatusMut.mutate(s); 
                          setIsStatusDropdownOpen(false); 
                        }} 
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {canEditTask && (
              <button 
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Delete Task',
                    message: 'Are you sure you want to delete this task? This action cannot be undone.',
                    isDangerous: true,
                    onConfirm: () => deleteTaskMut.mutate()
                  });
                }}
                disabled={deleteTaskMut.isPending}
                className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <button onClick={() => { onClose(); setIsEditingTitle(false); }} className="p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#18181b] hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* === Content === */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="mb-6 group">
            {isEditingTitle && canEditTask ? (
              <input 
                autoFocus
                className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-purple-500 outline-none py-1"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                disabled={updateTitleMut.isPending}
              />
            ) : (
              <h2 
                onClick={() => { if (canEditTask) { setIsEditingTitle(true); setEditTitleValue(task.title); } }}
                className={`text-2xl font-bold text-gray-900 dark:text-white leading-tight px-1 -ml-1 flex items-center justify-between ${canEditTask ? 'cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors' : ''}`}
              >
                {updateTitleMut.isPending ? 'Updating title...' : task.title}
                {canEditTask && <Edit3 className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100" />}
              </h2>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assignee</span>
              <div className="relative group inline-block w-full max-w-[200px]">
                <div className={`flex items-center gap-2 p-1.5 -ml-1.5 rounded-lg transition-colors ${userRole === 'ADMIN' ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : ''}`}>
                  {displayAssignee ? (
                    <>
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0 relative">
                        {getInitials(displayAssignee.firstName ? `${displayAssignee.firstName} ${displayAssignee.lastName}` : (displayAssignee.name || displayAssignee.email || '?'))}
                        {(displayAssignee.email === currentUserEmail ? currentUserAvatar : displayAssignee.avatarUrl) && (
                          <img 
                            src={displayAssignee.email === currentUserEmail ? currentUserAvatar : displayAssignee.avatarUrl} 
                            alt="Assignee" 
                            className="absolute inset-0 w-full h-full object-cover z-10" 
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                          />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {displayAssignee.firstName ? `${displayAssignee.firstName} ${displayAssignee.lastName}` : (displayAssignee.name || displayAssignee.email)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0 bg-gray-50 dark:bg-[#18181b]">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Unassigned</span>
                    </>
                  )}
                  {userRole === 'ADMIN' && <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />}
                </div>
                <select 
                  disabled={userRole !== 'ADMIN' || updateDetailsMut.isPending}
                  value={displayAssignee?.email || ''} 
                  onChange={(e) => updateDetailsMut.mutate({ assigneeEmail: e.target.value })}
                  className={`absolute inset-0 w-full h-full opacity-0 ${userRole === 'ADMIN' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <option value="">Unassigned</option>
                  {projectMembers.length > 0 ? (
                    projectMembers.map(m => <option key={m.id} value={m.email}>{m.name}</option>)
                  ) : (
                    <option value={currentUserEmail}>Assign to me</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Due Date</span>
              <div className="relative group inline-block w-full max-w-[200px]">
                <div className={`flex items-center gap-2 p-1.5 -ml-1.5 rounded-lg transition-colors ${canEditTask ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : ''}`}>
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className={`text-sm font-semibold ${displayDueDate ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {displayDueDate 
                      ? new Date(displayDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                      : 'No due date'}
                  </span>
                  {canEditTask && <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />}
                </div>
                <input 
                  type="date" 
                  disabled={!canEditTask || updateDetailsMut.isPending}
                  value={displayDueDate || ''}
                  onChange={(e) => updateDetailsMut.mutate({ dueDate: e.target.value })}
                  className={`absolute inset-0 w-full h-full opacity-0 ${canEditTask ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><AlignLeft className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Description</h3>
            </div>
            <textarea 
              disabled={!canEditTask || updateDetailsMut.isPending}
              defaultValue={task.description || ''}
              onBlur={(e) => {
                if (e.target.value !== task.description) {
                  updateDetailsMut.mutate({ description: e.target.value });
                }
              }}
              className={`w-full bg-gray-50 dark:bg-[#09090b] rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-800 min-h-[120px] outline-none transition-all resize-y placeholder-gray-400 dark:placeholder-gray-600 ${canEditTask ? 'hover:bg-gray-100 dark:hover:bg-[#18181b] focus:bg-white dark:focus:bg-[#09090b] focus:border-purple-300 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-50 dark:focus:ring-purple-500/10' : 'opacity-80 cursor-not-allowed'}`}
              placeholder={canEditTask ? "Add a detailed description... (Saves when you click away)" : "No description provided."}
            />
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Activity</h3>
            <div className="space-y-5">
              {task.comments?.map((comment: any, index: number) => (
                <div key={index} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-xs font-bold shrink-0 mt-1 relative">
                    {getInitials(getCommentAuthorName(comment))}
                    {(comment.user?.email === currentUserEmail ? currentUserAvatar : comment.user?.avatarUrl) && (
                      <img 
                        src={comment.user.email === currentUserEmail ? currentUserAvatar : comment.user.avatarUrl} 
                        alt="Avatar" 
                        className="absolute inset-0 w-full h-full object-cover z-10" 
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-200">
                          {getCommentAuthorName(comment)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                          {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {comment.user?.email === currentUserEmail && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingCommentId(comment.id); setEditCommentValue(comment.content); }} className="text-gray-300 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Comment',
                              message: 'Are you sure you want to delete this comment?',
                              isDangerous: true,
                              onConfirm: () => deleteCommentMut.mutate(comment.id)
                            });
                          }} disabled={deleteCommentMut.isPending} className="text-gray-300 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl rounded-tl-none overflow-hidden">
                      {editingCommentId === comment.id ? (
                        <div className="p-2">
                          <textarea 
                            autoFocus
                            className="w-full p-2 text-sm text-gray-700 dark:text-gray-300 bg-transparent border border-purple-200 dark:border-purple-800 rounded-lg outline-none resize-none focus:ring-1 focus:ring-purple-500"
                            value={editCommentValue}
                            onChange={(e) => setEditCommentValue(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancel</button>
                            <button onClick={() => updateCommentMut.mutate({ commentId: comment.id, content: editCommentValue })} disabled={updateCommentMut.isPending} className="px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {comment.content && comment.content !== 'Uploaded a file' && (<div className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</div>)}
                          
                          {comment.fileUrl && (
                            <div className={`p-3 bg-gray-50 dark:bg-[#121214] flex items-center justify-between gap-3 ${comment.content && comment.content !== 'Uploaded a file' ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                              <a href={comment.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0 group/link cursor-pointer" title="Click to preview">
                                <div className="w-10 h-10 rounded bg-white dark:bg-[#18181b] flex items-center justify-center border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm group-hover/link:border-purple-300 dark:group-hover/link:border-purple-600 transition-colors">
                                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate group-hover/link:text-purple-700 dark:group-hover/link:text-purple-400 transition-colors">{comment.fileName || "Attachment"}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">FILE</p>
                                </div>
                              </a>
                              <div className="flex items-center gap-2 shrink-0">
                                <button 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleForceDownload(comment.fileUrl, comment.fileName); 
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-800 transition-colors shadow-sm" 
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                {userRole !== 'VIEWER' && (
                                  <button 
                                    onClick={() => {
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: 'Remove Attachment',
                                        message: 'Are you sure you want to remove this attachment? The text comment will remain.',
                                        isDangerous: true,
                                        onConfirm: () => removeAttachmentMut.mutate(comment.id)
                                      });
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#18181b] border border-red-100 dark:border-red-900/30 rounded-full text-red-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-sm opacity-0 group-hover:opacity-100" 
                                    title="Remove attachment"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === Footer / Comment Area === */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121214] shrink-0 relative">
          {showEmojiPicker && (
            <div className="absolute bottom-full right-4 mb-2 z-50 shadow-2xl rounded-lg">
              <EmojiPicker theme={localStorage.getItem('workvia_theme') === 'dark' ? Theme.DARK : Theme.LIGHT} onEmojiClick={(emoji: any) => { setCommentText(prev => prev + emoji.emoji); setShowEmojiPicker(false); }} />
            </div>
          )}
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 relative">
              {getInitials(currentUserName)}
              {currentUserAvatar && (
                <img 
                  src={currentUserAvatar} 
                  alt="Me" 
                  className="absolute inset-0 w-full h-full object-cover z-10"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              )}
            </div>
              
            <div className="flex-1 flex flex-col gap-2">
              {pendingAttachment && (
                <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-lg px-3 py-2 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 overflow-hidden"><FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /><span className="text-xs font-bold text-purple-900 dark:text-purple-300 truncate">{pendingAttachment.fileName}</span></div>
                  <button onClick={() => setPendingAttachment(null)} className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-white dark:bg-transparent rounded-full p-0.5"><X className="w-3 h-3" /></button>
                </div>
              )}
                
              <div className={`border border-gray-200 dark:border-gray-800 rounded-xl transition-all flex flex-col relative ${userRole !== 'VIEWER' ? 'focus-within:ring-2 focus-within:ring-purple-500' : 'opacity-80'}`}>
                
                {/* Mention menu */}
                {mentionQuery !== null && (
                  <div className="absolute bottom-[50px] left-2 mb-1 w-48 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Select a member
                    </div>
                    <div className="max-h-48 overflow-y-auto scrollbar-hide">
                      {(() => {
                        const filteredMembers = projectMembers.filter(m => {
                          const isMe = m.email === currentUserEmail;
                          const amIAssignee = displayAssignee?.email === currentUserEmail;
                          if (isMe && amIAssignee) return false;
                          const isAlreadyMentioned = commentText.includes(`@${m.name}`);
                          if (isAlreadyMentioned) return false;
                          return m.name.toLowerCase().includes(mentionQuery.toLowerCase());
                        });

                        return filteredMembers.length > 0 ? (
                          filteredMembers.map(member => (
                            <div 
                              key={member.id} 
                              onClick={() => insertMention(member.name)}
                              className="px-3 py-2.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-500/10 cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              <div className={`w-5 h-5 rounded-full overflow-hidden ${member.color || 'bg-purple-600'} flex items-center justify-center text-white text-[10px] font-bold shrink-0 relative`}>
                                {member.avatar || getInitials(member.name)}
                                {(member.email === currentUserEmail ? currentUserAvatar : member.avatarUrl) && (
                                  <img 
                                    src={member.email === currentUserEmail ? currentUserAvatar : member.avatarUrl} 
                                    alt="Member" 
                                    className="absolute inset-0 w-full h-full object-cover z-10" 
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                                  />
                                )}
                              </div>
                              <span className="truncate font-semibold">{member.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2.5 text-sm text-gray-400 italic">No members found</div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <textarea 
                  disabled={userRole === 'VIEWER'}
                  value={commentText} 
                  onChange={handleCommentChange} 
                  placeholder={userRole === 'VIEWER' ? "Viewers cannot post comments." : "Write a comment... (Type @ to mention)"} 
                  className={`w-full text-sm p-3 outline-none resize-none h-14 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${userRole === 'VIEWER' ? 'cursor-not-allowed' : ''}`} 
                />
                
                <div className="bg-gray-50 dark:bg-[#18181b] px-3 py-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 rounded-b-xl">
                  <div className={`flex items-center gap-2 text-gray-400 dark:text-gray-500 ${userRole === 'VIEWER' ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadFileMut.isPending ? (<Loader2 className="w-4 h-4 animate-spin text-purple-500" />) : (<Paperclip onClick={() => fileInputRef.current?.click()} className="w-4 h-4 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer" />)}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Smile onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-4 h-4 cursor-pointer ${showEmojiPicker ? 'text-purple-600 dark:text-purple-400' : 'hover:text-purple-600 dark:hover:text-purple-400'}`} />
                  </div>
                  {userRole !== 'VIEWER' && (
                    <button onClick={handleSendComment} disabled={postCommentMut.isPending} className="bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">
                      {postCommentMut.isPending ? 'Sending...' : 'Send'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
        confirmText="Yes, delete it"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}