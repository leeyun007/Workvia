import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function About() {
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

      <main className="flex-1 w-full max-w-5xl mx-auto px-6">
        
        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center py-32 border-b border-gray-800/50">
          <p className="text-[#818cf8] text-xs font-bold tracking-[0.2em] uppercase mb-6">About Workvia</p>
          
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-white mb-6 leading-[1.2] pb-2">
            Less management. 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">More</span>
            <span className="block mt-4 leading-[1.3] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              building.
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            Workvia started from a simple frustration: project management tools should help you work, not create more work. It is built to be the tool that was always missing.
          </p>
        </section>

        {/* Mission */}
        <section className="py-24 border-b border-gray-800/50 flex flex-col md:flex-row gap-12 md:gap-24">
          <div className="md:w-1/3">
            <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase mb-4">Workvia Mission</p>
            <h2 className="text-3xl font-bold text-white leading-tight">Make teamwork<br/>feel effortless</h2>
          </div>
          <div className="md:w-2/3 space-y-6 text-gray-400 text-lg leading-relaxed">
            <p>
              Too many teams spend more time managing tools than doing actual work. Status updates, context switching, and lost threads all add up.
            </p>
            <p>
              Workvia is designed to make project management invisible. It brings tasks, conversations, and documents into one clean workspace. No bloat. No learning curve. Just clarity to help you and your team move faster.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 border-b border-gray-800/50 flex flex-col items-center">
          <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase mb-4 text-center">Workvia Values</p>
          <h2 className="text-3xl font-bold text-white text-center mb-16">What drives Workvia</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Speed first</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Every interaction is optimized for speed. No loading spinners, no waiting, just instant feedback that keeps you in flow.</p>
            </div>

            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Focus on what matters</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Remove the noise so you can focus on the work that actually moves things forward.</p>
            </div>

            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Built for teams</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Designed for real-time collaboration, shared context, and transparent workflows that keep everyone aligned.</p>
            </div>

            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Trust & privacy</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Your data stays yours. Enterprise-grade encryption is used, and your information is never sold.</p>
            </div>

            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Thoughtful design</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Every pixel is intentional. The goal is to make the tool feel invisible, so your work stands out.</p>
            </div>

            <div className="bg-[#121214] border border-gray-800/60 rounded-2xl p-8 hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              <h3 className="text-white font-semibold mb-3">Open by default</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Works with the tools you already use. No walled gardens, just seamless integration into your workflow.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center justify-center text-center py-32">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to work smarter?</h2>
          <p className="text-gray-400 mb-10">Join thousands of teams who've already made the switch.</p>
          <div className="flex items-center gap-4">
            <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
              Start for free <span>→</span>
            </Link>
            <button className="bg-transparent border border-gray-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Log In
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-700 text-xs">
        © 2026 Workvia. All rights reserved.
      </footer>

    </div>
  );
}