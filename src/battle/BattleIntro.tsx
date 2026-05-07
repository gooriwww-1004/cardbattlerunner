/**
 * BattleIntro.tsx
 * 배틀 입장 연출
 * ① 배경 페이드인 + BGM 시작
 * ② 전장 전체 보기 (줌아웃 카메라)
 * ③ 포지션 라인 순차 표시
 * ④ 카드 자동 배치 연출
 * ⑤ UI 활성화 → onComplete 호출
 */
import { useState, useEffect, useRef } from 'react';
import type { RunnerExportData, GameMap } from '../types';

interface Props {
  data: RunnerExportData;
  map: GameMap | null;
  onComplete: () => void;
}

type IntroPhase =
  | 'fade_bg'      // 배경 페이드인
  | 'show_field'   // 전장 전체 보기
  | 'show_lines'   // 포지션 라인 표시
  | 'place_cards'  // 카드 배치
  | 'activate';    // UI 활성화

export default function BattleIntro({ data, map, onComplete }: Props) {
  const [phase, setPhase] = useState<IntroPhase>('fade_bg');
  const [bgOpacity,    setBgOpacity]    = useState(0);
  const [fieldOpacity, setFieldOpacity] = useState(0);
  const [linesVisible, setLinesVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [textVisible,  setTextVisible]  = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const bgUrl  = (map as any)?.backgroundUrl;
  const _bgmUrl = (map as any)?.bgmUrl || data.runner.titleScreen.bgmUrl;

  useEffect(() => {
    const seq = async () => {
      // ① 배경 페이드인 (1.5초)
      setPhase('fade_bg');
      await delay(100);
      setBgOpacity(1);

      // BGM: BattleGround.onComplete 후 처리 (중복 방지)

      await delay(1500);

      // ② 전장 전체 보기
      setPhase('show_field');
      setFieldOpacity(1);
      await delay(800);

      // ③ 포지션 라인
      setPhase('show_lines');
      setLinesVisible(true);
      await delay(700);

      // 맵 이름 텍스트
      setTextVisible(true);
      await delay(1200);

      // ④ 카드 배치 연출
      setPhase('place_cards');
      setCardsVisible(true);
      await delay(1000);

      // ⑤ 완료
      setPhase('activate');
      await delay(300);
      onComplete();
    };

    seq();
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">

      {/* 배경 이미지 */}
      <div className="absolute inset-0 transition-opacity duration-[1500ms]"
        style={{ opacity: bgOpacity }}>
        {bgUrl
          ? <img src={bgUrl} alt="bg" className="w-full h-full object-cover"/>
          : <div className="w-full h-full"
              style={{background:"radial-gradient(ellipse at center,#1a1030 0%,#060410 70%)"}}/>
        }
        <div className="absolute inset-0 bg-black/60"/>
      </div>

      {/* 전장 미니 레이아웃 (카메라 줌아웃 느낌) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6"
        style={{
          opacity: fieldOpacity,
          transition: "opacity 0.8s",
          transform: fieldOpacity ? "scale(1)" : "scale(1.3)",
        }}>

        {/* NPC 진영 미니 그리드 */}
        <div className={`space-y-1 transition-all duration-500 ${linesVisible?"opacity-100":"opacity-0"}`}>
          <p className="text-[9px] text-red-400/50 text-center uppercase tracking-[0.3em]">Enemy</p>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} className={`w-8 h-11 rounded border border-red-500/20 bg-red-900/10
                transition-all duration-300`}
                style={{transitionDelay:`${i*40}ms`,
                  opacity: linesVisible?1:0,
                  transform: linesVisible?"translateY(0)":"translateY(-10px)"
                }}>
                {cardsVisible && i < 6 && (
                  <div className="w-full h-full rounded bg-red-800/30 animate-pulse"
                    style={{animationDelay:`${i*100}ms`}}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 배틀라인 */}
        {linesVisible && (
          <div className="flex items-center gap-2 w-full max-w-xs animate-in fade-in duration-500">
            <div className="flex-1 h-px bg-gradient-to-l from-amber-400/60 to-transparent"/>
            <span className="text-[9px] text-amber-400/50 uppercase tracking-widest flex-shrink-0"
              style={{fontFamily:"Cinzel,serif"}}>Battle Line</span>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-400/60 to-transparent"/>
          </div>
        )}

        {/* 플레이어 진영 미니 그리드 */}
        <div className={`space-y-1 transition-all duration-500 ${linesVisible?"opacity-100":"opacity-0"}`}>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} className="w-8 h-11 rounded border border-blue-500/20 bg-blue-900/10"
                style={{
                  transitionDelay:`${i*40}ms`,
                  opacity: linesVisible?1:0,
                  transform: linesVisible?"translateY(0)":"translateY(10px)",
                  transition:"all 0.3s"
                }}>
                {cardsVisible && i < 6 && (
                  <div className="w-full h-full rounded bg-blue-800/30 animate-pulse"
                    style={{animationDelay:`${(i+6)*100}ms`}}/>
                )}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-blue-400/50 text-center uppercase tracking-[0.3em]">Player</p>
        </div>
      </div>

      {/* 맵 이름 오버레이 */}
      {textVisible && (
        <div className="absolute inset-x-0 top-1/3 -translate-y-1/2 text-center
          animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-amber-400/40 text-[9px] tracking-[0.5em] uppercase mb-1">
            {`Chapter ${data.chapters.findIndex(c=>(c as any).id===(map as any)?.chapterId)+1||1}`}
          </p>
          <h2 className="text-white text-2xl font-bold drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]"
            style={{fontFamily:"Cinzel,serif"}}>
            {map?.title || "Battle"}
          </h2>
          <p className="text-amber-400/50 text-xs mt-1">Level {map?.level}</p>
        </div>
      )}

      {/* SKIP 버튼 */}
      <button onClick={onComplete}
        className="absolute top-6 right-5 text-[10px] text-gray-600
          hover:text-gray-300 transition tracking-[0.3em] uppercase">
        SKIP ▶
      </button>

      {/* 하단 진행 표시 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
        {(['fade_bg','show_field','show_lines','place_cards','activate'] as IntroPhase[]).map((p)=>(
          <div key={p} className={`rounded-full transition-all duration-300 ${
            phase===p?"w-4 h-1.5 bg-amber-400":"w-1.5 h-1.5 bg-gray-700"
          }`}/>
        ))}
      </div>
    </div>
  );
}

// ── 유틸 ─────────────────────────────────────────────────
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _fadeVolume(audio: HTMLAudioElement, from: number, to: number, duration: number) {
  const steps = 20;
  const step  = (to - from) / steps;
  const interval = duration / steps;
  let current = from;
  const timer = setInterval(() => {
    current += step;
    audio.volume = Math.min(1, Math.max(0, current));
    if ((step > 0 && current >= to) || (step < 0 && current <= to)) {
      clearInterval(timer);
    }
  }, interval);
}
