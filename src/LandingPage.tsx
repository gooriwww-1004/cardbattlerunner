/**
 * LandingPage.tsx — Tactical Nova 배포용 첫 화면
 * 로컬 개발(localhost)에서는 사용 안 함
 */
import React, { useState } from 'react';
import type { RunnerExportData } from './types';

const GAME_ZIP = '/TacticalNova_game00.zip'; // public 폴더에 위치

interface Props {
  onLoad: (data: RunnerExportData) => void;
}

// ZIP 로드 + media/ 파일을 Blob URL로 매핑
async function loadZipData(url: string): Promise<RunnerExportData> {
  let JSZip: any;

  try {
    const mod = await import(
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as any
    );
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

  // Blob URL 매핑 (media/* → blob:)
  const blobMap = new Map<string, string>();
  await Promise.all(
    Object.keys(zip.files)
      .filter((k) => k.startsWith('media/') && !zip.files[k].dir)
      .map(async (k) => {
        const blob = await zip.files[k].async('blob');
        blobMap.set(k, URL.createObjectURL(blob));
      })
  );

  const remap = (obj: any): any => {
    if (typeof obj === 'string' && obj.startsWith('media/')) {
      return blobMap.get(obj) ?? obj;
    }
    if (Array.isArray(obj)) return obj.map(remap);
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) out[k] = remap(v);
      return out;
    }
    return obj;
  };

  const remapped = remap(data) as RunnerExportData;
  return remapped;
}

export default function LandingPage({ onLoad }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  // 새 게임 시작: ZIP 로드 → onLoad
  const handleStart = async () => {
    setLoading('게임 로딩 중...');
    setErr(null);
    try {
      const data = await loadZipData(GAME_ZIP);
      onLoad(data);
    } catch (e: any) {
      setErr(e?.message ?? '로드 실패');
    } finally {
      setLoading(null);
    }
  };

  // 이어서 하기: 로직 동일하게 ZIP 재로드
  const handleContinue = async () => {
    setLoading('로딩 중...');
    setErr(null);
    try {
      const data = await loadZipData(GAME_ZIP);
      onLoad(data);
    } catch (e: any) {
      setErr(e?.message ?? '로드 실패');
    } finally {
      setLoading(null);
    }
  };

  if (showCredits) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center px-6"
        onClick={() => setShowCredits(false)}
      >
        <div className="max-w-sm w-full bg-stone-900 border border-stone-700 rounded-2xl p-5 text-sm text-stone-200 space-y-2">
          <h2 className="text-base font-bold mb-2">Credits</h2>
          <p>Millennium Session</p>
          <p>👑 보스 K — 총괄 기획 & 디렉터</p>
          <p>🔬 유리 (Claude) — 연구실장 & 개발</p>
          <p>🌐 Perplexity — 외부 콘텐츠</p>
          <p>🎨 재미나이 (Gemini) — 디자인</p>
          <p>✍️ 서시 (Qwen) — 컨텐츠</p>
          <p className="mt-3 text-xs text-stone-400 text-right">
            탭하여 돌아가기
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-stone-100 flex flex-col items-center justify-center relative overflow-hidden">
      {/* 별빛 배경 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-60"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            }}
          />
        ))}
      </div>

      {/* 타이틀 */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <h1
          className="text-4xl md:text-5xl font-bold tracking-[0.3em] text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          TACTICAL NOVA
        </h1>
        <p className="mt-3 text-xs text-amber-300/70 uppercase tracking-[0.3em]">
          Runner v1.0
        </p>
      </div>

      {/* 버튼들 */}
      <div className="relative z-10 w-full max-w-xs space-y-3 px-6">
        {/* 시작 */}
        <button
          onClick={handleStart}
          disabled={!!loading}
          className="w-full py-3 rounded-2xl text-sm font-bold
                     bg-gradient-to-b from-amber-400 to-amber-500 text-black
                     shadow-[0_0_25px_rgba(251,191,36,0.5)]
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all active:scale-95"
        >
          {loading ? loading : '▶ 새 게임 시작'}
        </button>

        {/* 이어서 하기 — 항상 활성, ZIP 다시 로드 */}
        <button
          onClick={handleContinue}
          disabled={!!loading}
          className="w-full py-2.5 rounded-2xl text-sm font-semibold
                     bg-stone-900 text-amber-200
                     border border-amber-400/40
                     hover:bg-stone-800 hover:border-amber-300
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all active:scale-95"
        >
          ↺ 이어서 하기
        </button>

        {/* 만든 사람들 */}
        <button
          onClick={() => setShowCredits(true)}
          className="w-full py-2.5 rounded-2xl text-xs text-stone-500
                     border border-stone-800 hover:border-stone-600 hover:text-stone-400
                     transition-all active:scale-95"
        >
          만든 사람들
        </button>

        {/* 에러 */}
        {err && (
          <div className="mt-2 text-xs text-red-400 text-center whitespace-pre-line">
            {err}
          </div>
        )}
      </div>

      {/* 하단 푸터 */}
      <div className="absolute bottom-4 inset-x-0 text-center text-[10px] text-stone-500 z-10">
        MILLENNIUM SESSION © 2026
      </div>
    </div>
  );
}