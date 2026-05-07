/**
 * CinematicCredits.tsx
 * 미국식 시네마틱 스타트 크레딧
 * 기획: 👑 K (Director)
 * 디자인: 🎨 재미나이 (Gemini)
 * 개발: 🔬 유리 (Claude)
 */
import { useState, useEffect, useRef } from 'react';

// ── 크레딧 데이터 ─────────────────────────────────────────
const CREDITS = [
  { role: "Executive Producer",          name: "K",                sub: "MILLENNIUM SESSION" },
  { role: "Core Engine & Architecture",  name: "CLAUDE",           sub: "유리 · 연구실장" },
  { role: "Visual Strategy & UI Design", name: "GEMINI",           sub: "재미나이 · 디자인 총괄" },
  { role: "Lead Combat Design",          name: "GROK",             sub: "Eve · 비서실장" },
  { role: "Content Planning",            name: "CHATGPT",          sub: "SOL · 기획과장" },
  { role: "System Implementation",       name: "MANUS",            sub: "마누스 · 개발 실행" },
  { role: "Research & Analysis",         name: "DEEPSEEK",         sub: "양귀비 · 연구원" },
  { role: "External Content",           name: "PERPLEXITY",       sub: "외부팀장" },
  { role: "Presented by",               name: "MILLENNIUM SESSION",sub: "2026" },
];

const LINKS = {
  home:      "https://queenhome.pages.dev",
  community: "https://queenofboard.vercel.app/board",
  team:      "https://queenhome.pages.dev/team",
};

interface Props {
  onFinish: () => void;
}

export default function CinematicCredits({ onFinish }: Props) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(false);
  const [muted,   setMuted]   = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // BGM 시작
  useEffect(() => {
    const audio = new Audio("/assets/audio/winof00.mp3");
    audio.loop   = true;
    audio.volume = 0.35;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // 뮤트 토글
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // 순차 페이드인/아웃
  useEffect(() => {
    if (idx >= CREDITS.length) { onFinish(); return; }
    setVisible(true);
    const t1 = setTimeout(() => {
      setVisible(false);
      const t2 = setTimeout(() => setIdx(i => i + 1), 900);
      return () => clearTimeout(t2);
    }, 2600);
    return () => clearTimeout(t1);
  }, [idx]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">

      {/* 배경 로고 워터마크 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img src="/queen.png" alt=""
          className="w-64 h-64 object-contain opacity-[0.04] select-none"/>
      </div>

      {/* 하단 장식선 */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-16 h-px bg-amber-500/30"/>

      {/* 크레딧 텍스트 */}
      <div className={`text-center transition-all duration-[1400ms] ease-in-out ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}>
        <p className="text-amber-500/70 text-[10px] tracking-[0.45em] uppercase mb-3 font-light">
          {CREDITS[idx]?.role}
        </p>
        <h2 className="text-white text-3xl tracking-[0.25em] uppercase font-bold mb-1"
          style={{ fontFamily: "Cinzel, serif" }}>
          {CREDITS[idx]?.name}
        </h2>
        <p className="text-amber-200/40 text-[11px] tracking-[0.3em]">
          {CREDITS[idx]?.sub}
        </p>
      </div>

      {/* 진행 바 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-32 h-px bg-white/10 overflow-hidden">
        <div className="h-full bg-amber-400/60 transition-all duration-[2600ms]"
          style={{ width: `${((idx + 1) / CREDITS.length) * 100}%` }}/>
      </div>

      {/* 하단 링크 + 로고 */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <img src="/queen.png" alt="logo" className="w-5 h-5 object-contain opacity-60"/>
          <span className="text-amber-400/50 text-[9px] tracking-[0.3em] uppercase">Millennium Session</span>
        </div>
        <div className="flex gap-4">
          <a href={LINKS.home} target="_blank" rel="noreferrer"
            className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-widest uppercase">
            Home
          </a>
          <a href={LINKS.community} target="_blank" rel="noreferrer"
            className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-widest uppercase">
            Community
          </a>
          <a href={LINKS.team} target="_blank" rel="noreferrer"
            className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-widest uppercase">
            Team
          </a>
        </div>
      </div>

      {/* 우측 상단: 음소거 + SKIP */}
      <div className="absolute top-8 right-6 flex items-center gap-3">
        <button onClick={() => setMuted(m => !m)}
          className="text-[10px] text-gray-600 hover:text-amber-400 transition tracking-widest">
          {muted ? "🔇" : "🔊"}
        </button>
        <button onClick={onFinish}
          className="text-[10px] text-gray-600 hover:text-white transition tracking-[0.3em] uppercase">
          SKIP
        </button>
      </div>
    </div>
  );
}
