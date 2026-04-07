import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../contexts/ToastContext';

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "Too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Too long"),
  email: z.string().email("Please enter a valid email address").transform(e => e.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { toast } = useToast();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSuccess, countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    try {
      const res = await fetch('${import.meta.env.VITE_API_URL}/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }) 
      });

      if (res.ok) {
        setCountdown(60); // Restart 60s countdown
        toast('success', 'Email Resent', 'A new verification link has been sent to your email.');
      } else {
        toast('error', 'Failed to resend', 'Could not resend email.');
      }
    } catch (error) {
      toast('error', 'Network Error', 'Failed to connect to the server.');
    }
  };

  const { 
    register, 
    handleSubmit, 
    watch, // Watch for email changes to display on the success screen
    formState: { errors } 
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema)
  });

  const userEmail = watch("email") || "";

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('${import.meta.env.VITE_API_URL}/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setErrorMsg(resData.error || 'Registration failed, please try again.');
      }
    } catch (error) {
      setErrorMsg('Network error. Is Spring Boot running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden">
      
      {/* Left side: Hero section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-violet-600 to-blue-500 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        <Link to="/" className="flex items-center gap-3 relative z-10 hover:opacity-90 transition-opacity w-max">
          <Logo variant="white" />
        </Link>

        <div className="relative z-10 mt-6 xl:mt-10">
          <h1 className="text-3xl xl:text-5xl font-bold text-white mb-4 xl:mb-6 leading-tight">
            Start organizing your projects today
          </h1>
          <p className="text-white/90 text-base xl:text-lg max-w-md mb-6 xl:mb-8 leading-relaxed">
            Join thousands of developers and agile teams managing their tasks efficiently with modern Kanban boards and powerful collaboration tools.
          </p>
          <div className="w-full h-48 xl:h-64 bg-gray-200 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20">
            <img 
              src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800" 
              alt="Team collaborating on a Kanban board" 
              className="w-full h-full object-cover opacity-90"
            />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 mt-6 xl:mt-10">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#f472b6] flex items-center justify-center text-white text-xs font-bold border-2 border-[#5b61f4]">AM</div>
            <div className="w-10 h-10 rounded-full bg-[#38bdf8] flex items-center justify-center text-white text-xs font-bold border-2 border-[#5b61f4]">JL</div>
            <div className="w-10 h-10 rounded-full bg-[#4ade80] flex items-center justify-center text-white text-xs font-bold border-2 border-[#5b61f4]">SK</div>
            <div className="w-10 h-10 rounded-full bg-[#fb923c] flex items-center justify-center text-white text-xs font-bold border-2 border-[#5b61f4]">TC</div>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Trusted by agile teams worldwide</p>
            <p className="text-white/80 text-sm">Join 10,000+ users already managing tasks</p>
          </div>
        </div>
      </div>

      {/* Right side: Form or Success State */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="max-w-md w-full my-auto">
          
          {/* Toggle between verification card and signup form based on success state */}
          {isSuccess ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 py-8">
              <div className="w-20 h-20 bg-purple-50 dark:bg-purple-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-purple-100 dark:border-purple-500/20">
                <Mail className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Verify Email</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm leading-relaxed">
                We've sent a verification email to your address. Please click the link in the email to complete your activation.
              </p>

              {/* Obfuscated email display */}
              <div className="bg-purple-50 dark:bg-[#18181b] text-purple-700 dark:text-purple-400 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 mb-8 border border-purple-100 dark:border-purple-500/30">
                <Mail className="w-4 h-4" /> 
                {userEmail.split('@')[0]?.substring(0, 2)}***@{userEmail.split('@')[1] || 'example.com'}
              </div>

              <div className="w-full bg-gray-50 dark:bg-[#121214] p-5 rounded-2xl text-left border border-gray-100 dark:border-gray-800 mb-8">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-purple-500" /> Didn't receive the email? Please check:
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2 pl-6 list-disc marker:text-gray-300 dark:marker:text-gray-700">
                  <li>Spam / Junk folder</li>
                  <li>Is the email address correct?</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>

              <button 
                onClick={handleResendEmail}
                disabled={countdown > 0}
                className="w-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30 disabled:bg-gray-100 dark:disabled:bg-[#121214] disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed py-3 rounded-xl font-bold text-sm transition-colors"
              >
                {countdown > 0 ? `Resend (${countdown}s)` : 'Resend Verification Email'}
              </button>
              
              <button 
                onClick={() => window.location.reload()} 
                className="mt-6 text-sm text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 font-medium"
              >
                Register with a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl xl:text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
              <p className="text-gray-600 mb-6">
                Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
              </p>

              <div className="mb-5 flex justify-center w-full">
                <GoogleLogin
                  text="signup_with"
                  onSuccess={async (credentialResponse) => {
                    const googleToken = credentialResponse.credential;
                    try {
                      const response = await fetch('${import.meta.env.VITE_API_URL}/api/auth/google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: googleToken })
                      });
                      
                      const data = await response.json();
                      if (response.ok) {
                        localStorage.setItem('workvia_token', data.token);
                        localStorage.setItem('workvia_user_name', data.name);
                        localStorage.setItem('workvia_user_email', data.email);
                        localStorage.setItem('workvia_oauth_provider', data.oauthProvider || 'GOOGLE');
                        navigate('/dashboard'); 
                      } else {
                        setErrorMsg(data.error || 'Registration failed, please try again.');
                      }
                    } catch (error) {
                      setErrorMsg("Network error connecting to backend");
                    }
                  }}
                  onError={() => {
                    setErrorMsg("Google Sign Up Failed");
                  }}
                  useOneTap
                />
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Or sign up with email</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <div className="relative">
                      <input 
                        {...register("firstName")}
                        type="text" 
                        placeholder="e.g. John" 
                        className="w-full bg-[#f9fafb] border border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 outline-none transition-all text-gray-900"
                      />
                    </div>
                    {errors.firstName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.firstName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                    <div className="relative">
                      <input 
                        {...register("lastName")}
                        type="text" 
                        placeholder="e.g. Doe" 
                        className="w-full bg-[#f9fafb] border border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 outline-none transition-all text-gray-900"
                      />
                    </div>
                    {errors.lastName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.lastName.message}</p>}
                  </div>
                </div>
                
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
                      className="w-full bg-[#f9fafb] border border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-lg pl-11 pr-4 py-3 outline-none transition-all text-gray-900"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      {...register("password")}
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full bg-[#f9fafb] border border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-lg pl-11 pr-4 py-3 outline-none transition-all text-gray-900"
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input 
                    type="checkbox" 
                    required 
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg py-3 mt-2 transition-all shadow-md flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-gray-500 mt-5 max-w-xs mx-auto">
                By creating an account, you agree to receive product updates and marketing communications.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}