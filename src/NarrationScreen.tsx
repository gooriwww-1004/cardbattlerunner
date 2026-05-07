/**
 * NarrationScreen.tsx
 * 맵 입장 전 나레이션 스크롤 화면
 * 에디터 스토리탭 설정값 연동:
 *   script, narrationDir, narrationSpeed, narrationFontSize, narrationColor
 * 종료 → onComplete() 호출 → 배틀 로딩
 */
import { useEffect, useRef, useState } from 'react';
import type { GameMap } from './types';

interface Props {
  map: GameMap | null;
  onComplete: () => void;
}

export default function NarrationScreen({ map, onComplete }: Props) {
  const script    = (map as any)?.script ?? '';
  const dir       = (map as any)?.narrationDir       ?? 'up';
  const speed     = (map as any)?.narrationSpeed      ?? 8;   // 초
  const fontSize  = (map as any)?.narrationFontSize   ?? 16;  // px
  const color     = (map as any)?.narrationColor      ?? '#ffffff';
  const bgUrl     = (map as any)?.backgroundUrl;

  const [done, setDone] = useState(false);
  const animRef = useRef<Animation | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // script 없으면 즉시 완료
  useEffect(() => {
    if (!script.trim()) { onComplete(); return; }
  }, [script]);

  useEffect(() => {
    if (!textRef.current || !script.trim()) return;

    const el = textRef.current;
    const ms = speed * 1000;

    // 방향별 keyframes
    const kf: Keyframe[] = (() => {
      switch(dir) {
        case 'down':  return [{ transform:'translateY(-100%)' }, { transform:'translateY(100%)' }];
        case 'left':  return [{ transform:'translateX(100%)'  }, { transform:'translateX(-100%)' }];
        case 'right': return [{ transform:'translateX(-100%)' }, { transform:'translateX(100%)'  }];
        default:      return [{ transform:'translateY(100%)'  }, { transform:'translateY(-100%)' }];
      }
    })();

    const anim = el.animate(kf, {
      duration: ms,
      easing: 'linear',
      fill: 'forwards',
    });

    animRef.current = anim;
    anim.onfinish = () => setDone(true);

    return () => anim.cancel();
  }, [script, dir, speed]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [done]);

  if (!script.trim()) return null;

  const isHorizontal = dir === 'left' || dir === 'right';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden"
      style={{
        background: bgUrl
          ? `linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.7)), url(${bgUrl}) center/cover`
          : 'linear-gradient(180deg, #060410 0%, #0d0b1a 100%)',
      }}>

      {/* 스킵 버튼 */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 z-10 text-[10px] text-gray-500
          border border-gray-700 rounded-full px-3 py-1 hover:text-gray-300
          hover:border-gray-500 transition">
        SKIP ▶
      </button>

      {/* 스크롤 컨테이너 */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
        <div
          ref={textRef}
          className={`${isHorizontal ? 'w-max max-w-none px-16' : 'w-full max-w-md px-8 text-center'}`}
          style={{
            fontSize: `${fontSize}px`,
            color,
            lineHeight: 1.9,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            fontFamily: 'serif',
            whiteSpace: isHorizontal ? 'nowrap' : 'pre-wrap',
          }}>
          {script}
        </div>
      </div>

      {/* 상단/하단 페이드 마스크 */}
      {!isHorizontal && (
        <>
          <div className="absolute top-0 left-0 right-0 h-24 z-10"
            style={{background:'linear-gradient(to bottom, #060410, transparent)'}}/>
          <div className="absolute bottom-0 left-0 right-0 h-24 z-10"
            style={{background:'linear-gradient(to top, #060410, transparent)'}}/>
        </>
      )}
      {isHorizontal && (
        <>
          <div className="absolute top-0 bottom-0 left-0 w-24 z-10"
            style={{background:'linear-gradient(to right, #060410, transparent)'}}/>
          <div className="absolute top-0 bottom-0 right-0 w-24 z-10"
            style={{background:'linear-gradient(to left, #060410, transparent)'}}/>
        </>
      )}

      {/* 완료 페이드 */}
      {done && (
        <div className="absolute inset-0 z-20 bg-black animate-in fade-in duration-700"/>
      )}
    </div>
  );
}
