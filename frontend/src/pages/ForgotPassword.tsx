import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Key } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMsg(data.message);
      } else {
        setStatus('error');
        setMsg(data.error || 'Failed to process request.');
      }
    } catch (err) {
      setStatus('error');
      setMsg('Network error.');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#8b5cf6] font-['Plus_Jakarta_Sans',sans-serif] px-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-3xl shadow-2xl">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
          Reset your password
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8 leading-relaxed px-2">
          Enter the email associated with your account and we'll send a reset link.
        </p>

        {status === 'success' ? (
          // Success State
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 font-medium text-sm border border-emerald-100">
              {msg}
            </div>
            <Link to="/login" className="text-gray-500 font-semibold hover:text-gray-700 flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Sign in
            </Link>
          </div>
        ) : (
          // Reset Form
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium animate-in fade-in">
                {msg}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm font-medium text-gray-900" 
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={status === 'loading'} 
              className="w-full bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-50 shadow-md"
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>

            {/* Back to Login Link */}
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}