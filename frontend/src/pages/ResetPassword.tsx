import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); 
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('error'); 
      setMsg('Invalid or missing token.'); 
      return;
    }
    
    // Verify passwords match
    if (newPassword !== confirmPassword) {
      setStatus('error'); 
      setMsg('Passwords do not match. Please try again.'); 
      return;
    }
    
    // Validate password length
    if (newPassword.length < 8) {
      setStatus('error'); 
      setMsg('Password must be at least 8 characters long.'); 
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('http://localhost:8080/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast('success', 'Password Reset', data.message);
        navigate('/login');
      } else {
        setStatus('error'); 
        setMsg(data.error);
      }
    } catch (err) {
      setStatus('error'); 
      setMsg('Network error. Please try again.');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] font-['Plus_Jakarta_Sans',sans-serif] px-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-3xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
          Set new password
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8 leading-relaxed px-2">
          Create a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {status === 'error' && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium animate-in fade-in">
              {msg}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">New Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password" 
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-xl pl-12 pr-12 py-3.5 outline-none transition-all text-sm font-medium text-gray-900" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm new password" 
                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-xl pl-12 pr-12 py-3.5 outline-none transition-all text-sm font-medium text-gray-900" 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status === 'loading'} 
            className="w-full bg-[#a882ff] hover:bg-[#8b5cf6] text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-50 shadow-sm mt-2"
          >
            {status === 'loading' ? 'Saving...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}