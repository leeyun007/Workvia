import { useState, useEffect, useRef } from 'react';
import { User, Lock, Mail, Briefcase, Globe, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Dynamic Data State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hidden file input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oauthProvider, setOauthProvider] = useState('LOCAL');
  const { toast } = useToast();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    // 1. Prioritize stored First/Last Name, fallback to splitting User Name
    const storedFullName = localStorage.getItem('workvia_user_name') || '';
    const storedFirst = localStorage.getItem('workvia_first_name');
    const storedLast = localStorage.getItem('workvia_last_name');

    if (storedFirst !== null && storedLast !== null) {
      setFirstName(storedFirst);
      setLastName(storedLast);
    } else {
      const nameParts = storedFullName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }

    // 2. Load email, job title, bio, and avatar
    setEmail(localStorage.getItem('workvia_user_email') || '');
    setJobTitle(localStorage.getItem('workvia_job_title') || '');
    setBio(localStorage.getItem('workvia_bio') || '');
    setAvatarUrl(localStorage.getItem('workvia_avatar') || null);
    setOauthProvider(localStorage.getItem('workvia_oauth_provider') || 'LOCAL');
  }, []);

  // Profile save logic
  const handleSaveProfile = async () => {
    const token = localStorage.getItem('workvia_token');
    const profileData = { firstName, lastName, jobTitle, bio };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(profileData)
      });

      if (res.ok) {
        localStorage.setItem('workvia_first_name', firstName);
        localStorage.setItem('workvia_last_name', lastName);
        localStorage.setItem('workvia_user_name', `${firstName} ${lastName}`);
        localStorage.setItem('workvia_job_title', jobTitle);
        localStorage.setItem('workvia_bio', bio);
        
        // Dispatch event to update Layout components
        window.dispatchEvent(new Event('profileUpdated'));
        toast('success', 'Profile Updated', 'Your profile has been updated successfully.');
      } else {
        toast('error', 'Failed to Update Profile', 'Unable to update the profile. Please try again.');
      }
    } catch (err) {
      console.error("Save profile error:", err);
    }
  };

  // Avatar upload logic
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const localPreviewUrl = reader.result as string;
      setAvatarUrl(localPreviewUrl);

      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('workvia_token');
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const text = await res.text();
          let finalUrl = localPreviewUrl; 

          try {
            const data = JSON.parse(text);
            finalUrl = data.avatarUrl || data.fileUrl || data.url || localPreviewUrl;
          } catch (e) {
            console.log("Backend returned plain text instead of JSON");
          }

          // 1. Update State and LocalStorage first
          setAvatarUrl(finalUrl); 
          localStorage.setItem('workvia_avatar', finalUrl); 
          
          // 2. Dispatch event to update Layout with the latest image
          window.dispatchEvent(new Event('profileUpdated'));
          
          toast('success', 'Avatar Uploaded', 'Your avatar has been uploaded successfully.');
        } else {
          throw new Error('Server returned an error');
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
        localStorage.setItem('workvia_avatar', localPreviewUrl);
        window.dispatchEvent(new Event('profileUpdated')); 
      }
    };
    reader.readAsDataURL(file); 
  };

  // Avatar removal logic
  const handleRemoveAvatar = async () => {
    if (!window.confirm("Are you sure you want to remove your avatar?")) return;
    const token = localStorage.getItem('workvia_token');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/avatar`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        // 1. Clear current avatar
        setAvatarUrl(null);
        localStorage.removeItem('workvia_avatar');
        
        // 2. Dispatch event to Layout to fallback to initials
        window.dispatchEvent(new Event('profileUpdated'));
        
        toast('success', 'Avatar Removed', 'Your avatar has been removed successfully.');
      }
    } catch (err) {
      console.error("Failed to delete avatar", err);
      toast('error', 'Failed to Remove Avatar', 'Unable to remove the avatar. Please try again.');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast('error', 'Password Mismatch', 'New passwords do not match.');
      return;
    }
    const token = localStorage.getItem('workvia_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        toast('success', 'Password Updated', 'Your password has been updated successfully.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        toast('error', 'Failed to Update Password', data.error || "Unable to update the password. Please try again.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] dark:bg-[#09090b] relative transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your account preferences and security settings.</p>
        </div>

        <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-8 transition-colors duration-200">
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            <User className="w-4 h-4" /> Profile
          </button>
          <button onClick={() => setActiveTab('security')} className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'security' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            <Lock className="w-4 h-4" /> Security
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Avatar</h3>
              <div className="flex items-center gap-6">
                
                <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md shrink-0 overflow-hidden border-2 border-purple-50 dark:border-[#18181b]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={() => {
                        setAvatarUrl(null);
                        localStorage.removeItem('workvia_avatar');
                      }}
                    />
                  ) : (
                    getInitials(`${firstName} ${lastName}`)
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleAvatarUpload} 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="bg-[#0f172a] dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Upload
                    </button>
                    {avatarUrl && (
                      <button onClick={handleRemoveAvatar} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm font-semibold transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Personal Information</h3>
              <form className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="email" value={email} disabled className="w-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b] text-gray-500 dark:text-gray-400 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none cursor-not-allowed" />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Email cannot be changed. Contact admin for assistance.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Job Title</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
                  <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"></textarea>
                </div>

                <div className="pt-2">
                  <button type="button" onClick={handleSaveProfile} className="bg-[#0f172a] dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Change Password</h3>
              
              {/* Show managed by Google prompt for OAuth users */}
              {oauthProvider === 'GOOGLE' ? (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-start gap-3 mt-4">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Managed by Google</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      You signed in to Workvia using your Google account. Your password and account security are managed directly by Google.
                    </p>
                  </div>
                </div>
              ) : (
                /* Show standard password change form for local users */
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Ensure your account stays secure by using a strong, unique password.</p>
                  
                  <form className="space-y-5 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button type="button" onClick={handleUpdatePassword} className="bg-[#0f172a] dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Update Password
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}