/**
 * LandingPage.tsx — Tactical Nova 배포용 첫 화면
 * 시작 버튼 하나 → ZIP 로드 → 게임 시작
 */
import { useState } from 'react';
import type { RunnerExportData } from './types';

const GAME_ZIP = 'https://cardbattlerunner-patch.netlify.app/TacticalNova_game00.zip';

interface Props {
  onLoad: (data: RunnerExportData) => void;
}

async function loadZipData(url: string): Promise<RunnerExportData> {
  let JSZip: any;
  try {
    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as any);
    JSZip = mod.default ?? (window as any).JSZip;
  } catch {
    JSZip = (window as any).JSZip;
  }
  if (!JSZip) throw new Error('JSZip 로드 실패');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`게임 파일 로드 실패: ${res.status}`);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const jsonFile = zip.file('data.json');
  if (!jsonFile) throw new Error('게임 데이터 없음');
  const text = await jsonFile.async('string');
  const data = JSON.parse(text) as RunnerExportData;

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

  const handleStart = async () => {
    setLoading('게임 로딩 중...');
    setErr(null);
    try {
      const data = await loadZipData(GAME_ZIP);
      onLoad(data);
    } catch (e: any) {
      setErr(e.message ?? '로드 실패');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #0f0a1a 0%, #000 100%)' }}>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.1,
            }} />
        ))}
      </div>

      <div className="relative z-10 text-center mb-12">
        <h1 className="text-4xl font-black tracking-[0.15em] mb-2"
          style={{
            fontFamily: 'Cinzel,serif',
            background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
          TACTICAL NOVA
        </h1>
        <p className="text-stone-500 text-xs tracking-[0.3em] uppercase">
          Runner v1.0
        </p>
      </div>

      <div className="relative z-10 w-56">
        <button onClick={handleStart} disabled={!!loading}
          className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider
            border border-amber-400/50 text-amber-200
            bg-gradient-to-r from-amber-900/40 to-amber-800/20
            hover:from-amber-800/60 hover:border-amber-400/80
            active:scale-95 transition-all disabled:opacity-50">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>{loading}
              </span>
            : '▶  게임 시작'}
        </button>
      </div>

      {err && (
        <div className="relative z-10 mt-4 px-4 py-2 rounded-xl
          bg-red-900/30 border border-red-500/30 text-red-300 text-xs text-center max-w-xs">
          {err}
        </div>
      )}

      <p className="absolute bottom-4 text-stone-700 text-[9px] tracking-widest">
        MILLENNIUM SESSION © 2026
      </p>
    </div>
  );
}
