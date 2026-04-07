import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, Loader2, RefreshCw } from 'lucide-react';
import Logo from '../components/Logo'; 
import { useToast } from '../contexts/ToastContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  // Extract token from URL parameters
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');

  // Core states: loading | success | expired | invalid
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid'>('loading');
  const hasFetched = useRef(false);

  useEffect(() => {
    // Mark as invalid if no token is provided
    if (!token) {
      setStatus('invalid');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    // Send verification request to the backend
    const verifyToken = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify?code=${token}`);
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success'); 
        } else {
          if (data.error === 'expired') {
            setStatus('expired'); 
          } else {
            setStatus('invalid'); 
          }
        }
      } catch (error) {
        setStatus('invalid');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async () => {
    try {
      // Send expired token to resend verification email
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }) 
      });

      if (res.ok) {
        toast('success', 'Email Resent', 'A new verification link has been sent to your email.');
      } else {
        toast('error', 'Failed to resend', 'Could not resend email. Please try signing up again.');
      }
    } catch (error) {
      toast('error', 'Network Error', 'Failed to connect to the server.');
    }
  };

  // Render different state cards based on verification status
  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center py-12 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-6" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verifying your email...</h2>
          <p className="text-gray-500 text-sm mt-2">Please wait a moment.</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 py-6">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-100 dark:border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Email verified successfully</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm leading-relaxed">
            Your email has been verified. You're all set to access your account.
          </p>
          <button onClick={() => navigate('/login')} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-md">
            Go to Sign In →
          </button>
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 py-6">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-amber-100 dark:border-amber-500/20">
            <Clock className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Verification link expired</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm leading-relaxed">
            This verification link has expired. Please request a new verification email.
          </p>
          <button onClick={handleResend} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Resend verification email
          </button>
        </div>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 py-6">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-red-100 dark:border-red-500/20">
            <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Invalid verification link</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm leading-relaxed">
            This verification link is invalid or has already been used. Please request a new one.
          </p>
          <button onClick={() => navigate('/login')} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-md">
            Back to Sign in
          </button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#09090b] font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="p-8 absolute top-0 left-0">
        <Logo variant={localStorage.getItem('workvia_theme') === 'dark' ? 'white' : 'colored'} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#121214] rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-8 xl:p-10 relative overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}