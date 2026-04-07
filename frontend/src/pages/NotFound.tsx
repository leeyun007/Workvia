import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="h-screen bg-[#f8fafc] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden relative">
      
      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full px-8 py-6">
        <Logo variant="colored" textDark={true} /> 
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative">
        
        <h1 className="text-[10rem] md:text-[16rem] font-black text-[#e2e8f0] leading-none select-none tracking-tighter -mt-12 md:-mt-24 mb-4">
          404
        </h1>
        
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#334155] mb-3">
            Oops! We couldn't find that page.
          </h2>
          <p className="text-[#64748b] text-base md:text-lg mb-8">
            It might have been moved or no longer exists.
          </p>

          <Link 
            to="/dashboard" 
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors shadow-sm mb-6"
          >
            Go to Dashboard
          </Link>

          <Link 
            to="/" 
            className="text-[#64748b] hover:text-[#0f172a] font-medium text-sm transition-colors flex items-center gap-1.5"
          >
            <span>&larr;</span> Back to Home
          </Link>
        </div>
        
      </main>
    </div>
  );
}