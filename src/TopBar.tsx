/**
 * TopBar.tsx
 * 모든 화면 공통 상단 로고 바
 */
import React from 'react';

interface Props {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function TopBar({ title, onBack, right }: Props) {
  return (
    <div className="h-14 border-b border-amber-400/20 flex items-center px-4 bg-black/70 flex-shrink-0 gap-3">
      {/* 뒤로가기 */}
      {onBack && (
        <button onClick={onBack} className="text-gray-400 hover:text-white transition text-sm flex-shrink-0">
          ←
        </button>
      )}

      {/* 로고 */}
      <img src="/queen.png" alt="logo"
        className="w-7 h-7 object-contain opacity-70 flex-shrink-0"
        onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>

      {/* 제목 */}
      <span className="text-[#fbbf24] font-bold tracking-wider flex-1 truncate"
        style={{fontFamily:"Cinzel,serif", fontSize:"0.85rem"}}>
        {title || "Tactical Nova"}
      </span>

      {/* 우측 */}
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
