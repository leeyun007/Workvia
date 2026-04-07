import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans">
      
      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <Logo />
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-0 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.3]">
          Master your workflow
          <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            with Workvia.
          </span>
        </h1>

        <p className="text-gray-400 text-lg max-w-xl mb-10">
          Plan projects, track tasks, and collaborate with your team in one place.
        </p>

        <div className="flex items-center gap-4">
          <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
            Start for free <span>→</span>
          </Link>

          <Link to="/login" className="bg-transparent border border-gray-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Log In
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-700 text-xs">
        © 2026 Workvia. All rights reserved.
      </footer>

    </div>
  );
}