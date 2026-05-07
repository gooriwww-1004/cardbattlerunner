/**
 * LandingPage.tsx — Tactical Nova 배포용 첫 화면
 * 로컬 개발(localhost)에서는 사용 안 함
 */
import { useState } from 'react';
import type { RunnerExportData } from './types';

const GAME_ZIP = '/TacticalNova_game00.zip'; // public 폴더에 위치
const SAVE_KEY = 'tacticalnova_gamedata';

interface Props {
  onLoad: (data: RunnerExportData) => void;
}

async function loadZipData(url: string): Promise<RunnerExportData> {
  // JSZip CDN 동적 로드 (LoadScreen과 동일 방식)
  let JSZip: any;
  try {
    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as any);
    JSZip = mod.default ?? (window as any).JSZip;
  } catch {
    JSZip = (window as any).JSZip;
  }
  if (!JSZip) throw new Error('JSZip 로드 실패. 인터넷 연결을 확인하세요.');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ZIP 로드 실패: ${res.status}`);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const jsonFile = zip.file('data.json');
  if (!jsonFile) throw new Error('data.json 없음');
  const text = await jsonFile.async('string');
  const data = JSON.parse(text) as RunnerExportData;

  // Blob URL 매핑
  const blobMap = new Map<string, string>();
  await Promise.all(
    Object.keys(zip.files)
      .filter(k => k.startsWith('media/') && !zip.files[k].dir)
      .map(async k => {
        const blob = await zip.files[k].async('blob');
        blobMap.set(k, URL.createObjectURL(blob));
      })
  );
  const remap = (obj: any): any => {
    if (typeof obj === 'string' && obj.startsWith('media/'))
      return blobMap.get(obj) ?? obj;
    if (Array.isArray(obj)) return obj.map(remap);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) out[k] = remap(v);
      return out;
    }
    return obj;
  };
  return remap(data) as RunnerExportData;
}

export default function LandingPage({ onLoad }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  const hasSave = !!localStorage.getItem(SAVE_KEY);

  // 시작 — ZIP 자동 로드
  const handleStart = async () => {
    setLoading('게임 로딩 중...');
    setErr(null);
    try {
      const data = await loadZipData(GAME_ZIP);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      onLoad(data);
    } catch (e: any) {
      setErr(e.message ?? '로드 실패');
    } finally {
      setLoading(null);
    }
  };

  // 이어서 하기 — localStorage 복원
  const handleContinue = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { setErr('저장된 데이터 없음'); return; }
    try {
      const data = JSON.parse(raw) as RunnerExportData;
      onLoad(data);
    } catch {
      setErr('저장 데이터 손상. 새 게임을 시작해주세요.');
    }
  };

  if (showCredits) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8"
      onClick={()=>setShowCredits(false)}>
      <h2 className="text-amber-400 font-bold text-xl mb-6"
        style={{fontFamily:'Cinzel,serif'}}>Credits</h2>
      <div className="space-y-3 text-center text-stone-300 text-sm">
        <p className="text-amber-300 font-bold">Millennium Session</p>
        <p>👑 보스 K — 총괄 기획 & 디렉터</p>
        <p>🔬 유리 (Claude) — 연구실장 & 개발</p>
        <p>🌐 Perplexity — 외부 콘텐츠</p>
        <p>🎨 재미나이 (Gemini) — 디자인</p>
        <p>✍️ 서시 (Qwen) — 컨텐츠</p>
      </div>
      <p className="text-stone-600 text-xs mt-8">탭하여 돌아가기</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      style={{
        background:'radial-gradient(ellipse at center, #0f0a1a 0%, #000 100%)',
      }}>

      {/* 별빛 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({length:40}).map((_,i)=>(
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width:`${Math.random()*2+1}px`,
              height:`${Math.random()*2+1}px`,
              left:`${Math.random()*100}%`,
              top:`${Math.random()*100}%`,
              opacity:Math.random()*0.6+0.1,
            }}/>
        ))}
      </div>

      {/* 타이틀 */}
      <div className="relative z-10 text-center mb-12">
        <h1 className="text-4xl font-black tracking-[0.15em] mb-2"
          style={{
            fontFamily:'Cinzel,serif',
            background:'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)',
            WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent',
            textShadow:'none',
          }}>
          TACTICAL NOVA
        </h1>
        <p className="text-stone-500 text-xs tracking-[0.3em] uppercase">
          Runner v1.0
        </p>
      </div>

      {/* 버튼들 */}
      <div className="relative z-10 flex flex-col gap-3 w-56">

        {/* 시작 */}
        <button onClick={handleStart} disabled={!!loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider
            border border-amber-400/50 text-amber-200
            bg-gradient-to-r from-amber-900/40 to-amber-800/20
            hover:from-amber-800/60 hover:border-amber-400/80
            active:scale-95 transition-all disabled:opacity-50">
          {loading ? loading : '▶  새 게임 시작'}
        </button>

        {/* 이어서 하기 */}
        <button onClick={handleContinue}
          disabled={!hasSave || !!loading}
          className={`w-full py-3 rounded-2xl font-bold text-sm tracking-wider
            border transition-all active:scale-95 ${
            hasSave
              ? 'border-teal-400/40 text-teal-300 bg-teal-900/20 hover:bg-teal-800/30'
              : 'border-stone-800 text-stone-700 cursor-not-allowed'
          }`}>
          ↺  이어서 하기
        </button>

        {/* 만든 사람들 */}
        <button onClick={()=>setShowCredits(true)}
          className="w-full py-2.5 rounded-2xl text-xs text-stone-500
            border border-stone-800 hover:border-stone-600 hover:text-stone-400
            transition-all active:scale-95">
          만든 사람들
        </button>
      </div>

      {/* 에러 */}
      {err && (
        <div className="relative z-10 mt-4 px-4 py-2 rounded-xl
          bg-red-900/30 border border-red-500/30 text-red-300 text-xs text-center">
          {err}
        </div>
      )}

      {/* 하단 */}
      <p className="absolute bottom-4 text-stone-700 text-[9px] tracking-widest">
        MILLENNIUM SESSION © 2026
      </p>
    </div>
  );
}