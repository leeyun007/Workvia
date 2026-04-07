import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'colored' | 'white';
  textDark?: boolean; 
  showText?: boolean; // Defaults to true for backward compatibility
}

export default function Logo({ variant = 'colored', textDark = false, showText = true }: LogoProps) {
  const isColored = variant === 'colored';

  return (
    <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity w-max relative z-10">
      <div className="scale-90 origin-left-top">
        <div className="grid grid-cols-3 gap-[2px]">
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded flex items-center justify-center ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white'}`}>
            <svg viewBox="0 0 24 24" className={`w-[8px] h-[8px] ${isColored ? 'text-white' : 'text-[#5b61f4]'}`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#0eabf5] to-[#5b75ec]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#5b75ec] to-[#9056e8]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#0eabf5] to-[#5b75ec]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white/90'}`}></div>
          <div className={`w-3 h-3 rounded flex items-center justify-center ${isColored ? 'bg-gradient-to-br from-[#3097f0] to-[#7165e9]' : 'bg-white'}`}>
            <svg viewBox="0 0 24 24" className={`w-[8px] h-[8px] ${isColored ? 'text-white' : 'text-[#5b61f4]'}`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      </div>
      
      {/* Optional logo text */}
      {showText && (
        <span className={`font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-xl ${textDark ? 'text-[#1e293b]' : 'text-white'}`}>
          Workvia
        </span>
      )}
    </Link>
  );
}