import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'; 
import { GoogleLogin } from '@react-oauth/google';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define Zod schema for login form validation
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform(e => e.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional()
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false); 

  // Initialize React Hook Form
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { rememberMe: false }
  });

  // Handle form submission
  const onSubmit = async (data: SignInFormValues) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data) 
      });

      const resData = await response.json();

      if (response.ok) {
        localStorage.setItem('workvia_token', resData.token);
        localStorage.setItem('workvia_user_name', resData.name);
        localStorage.setItem('workvia_user_email', resData.email);
        localStorage.setItem('workvia_first_name', resData.firstName || '');
        localStorage.setItem('workvia_last_name', resData.lastName || '');
        localStorage.setItem('workvia_avatar', resData.avatarUrl || '');
        localStorage.setItem('workvia_job_title', resData.jobTitle || '');
        localStorage.setItem('workvia_bio', resData.bio || '');
        localStorage.setItem('workvia_oauth_provider', resData.oauthProvider || 'LOCAL');
        navigate('/dashboard');
      } else {
        setErrorMsg(resData.error || 'Invalid email or password.');
      }
    } catch (error) {
      setErrorMsg('Network error. Is Spring Boot running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden">
      
      {/* Left Side: Brand Area */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#4f46e5] via-[#a855f7] to-[#ec4899] p-12 flex-col relative overflow-hidden">
        <Link to="/" className="flex items-center gap-4 relative z-10 hover:opacity-90 transition-opacity w-max mb-12">
          <Logo variant="white" />
        </Link>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-white mb-8 leading-relaxed max-w-lg">
            Organize your work. Track your progress. Collaborate with your team.
          </h2>
          
          <div className="w-full max-w-xl h-64 xl:h-80 bg-gray-200 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800" 
              alt="Team collaborating on a Kanban board" 
              className="w-full h-full object-cover opacity-95"
            />
          </div>
        </div>
      </div>

      {/* Right Side: Login Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="max-w-md w-full my-auto">
          
          <h2 className="text-3xl font-bold text-[#111827] mb-8">Sign in to Workvia</h2>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  {...register("email")}
                  type="text" 
                  placeholder="you@example.com" 
                  className={`w-full bg-[#f9fafb] border ${errors.email ? 'border-red-300' : 'border-transparent'} focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-lg pl-11 pr-4 py-3 outline-none transition-all text-gray-900`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  {...register("password")}
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className={`w-full bg-[#f9fafb] border ${errors.password ? 'border-red-300' : 'border-transparent'} focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 rounded-lg pl-11 pr-12 py-3 outline-none transition-all text-gray-900`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input 
                  {...register("rememberMe")}
                  type="checkbox" 
                  id="rememberMe"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer" 
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 font-medium cursor-pointer">Remember me</label>
              </div>
              <Link to="/forgot-password" className="text-sm font-semibold text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors shadow-md"
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-sm text-gray-400">Or continue with</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Google Login */}
          <div className="mt-6 flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const googleToken = credentialResponse.credential;
                try {
                  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: googleToken })
                  });
                  
                  const data = await response.json();
                  if (response.ok) {
                    localStorage.setItem('workvia_token', data.token);
                    localStorage.setItem('workvia_user_name', data.name);
                    localStorage.setItem('workvia_user_email', data.email);
                    localStorage.setItem('workvia_first_name', data.firstName || '');
                    localStorage.setItem('workvia_last_name', data.lastName || '');
                    localStorage.setItem('workvia_avatar', data.avatarUrl || '');
                    localStorage.setItem('workvia_job_title', data.jobTitle || '');
                    localStorage.setItem('workvia_bio', data.bio || '');
                    localStorage.setItem('workvia_oauth_provider', data.oauthProvider || 'GOOGLE');
                    navigate('/dashboard');
                  } else {
                    setErrorMsg(data.error || "Google login failed on server");
                  }
                } catch (error) {
                  setErrorMsg("Network error connecting to backend");
                }
              }}
              onError={() => setErrorMsg("Google Login Failed in browser")}
              useOneTap 
            />
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account? <Link to="/signup" className="font-semibold text-[#8b5cf6] hover:underline">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
}