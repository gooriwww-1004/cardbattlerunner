/**
 * LoadScreen.tsx v2
 * JSON + ZIP 번들 불러오기 지원
 */
import React, { useState } from 'react';
import CinematicCredits from './CinematicCredits';

const LINKS = {
  home:      "https://queenhome.pages.dev",
  community: "https://queenofboard.vercel.app/board",
  team:      "https://queenhome.pages.dev/team",
};

interface Props { onLoad: (data: any) => void; }

// ── base64 ↔ Blob URL 변환 ─────────────────────────────────
function isMediaPath(val: string): boolean {
  return typeof val === 'string' && val.startsWith('media/');
}

function remapUrls(obj: any, blobMap: Map<string, string>): any {
  if (typeof obj === 'string') {
    return isMediaPath(obj) ? (blobMap.get(obj) ?? obj) : obj;
  }
  if (Array.isArray(obj)) return obj.map(v => remapUrls(v, blobMap));
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = remapUrls(v, blobMap);
    return out;
  }
  return obj;
}

export default function LoadScreen({ onLoad }: Props) {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [progress,    setProgress]    = useState("");
  const [showCredits, setShowCredits] = useState(false);

  // ── JSON 로드 ─────────────────────────────────────────────
  const loadJson = (text: string) => {
      };

  // ── ZIP 번들 로드 ─────────────────────────────────────────
  const loadZip = async (file: File) => {
    setProgress('JSZip 로딩...');

    // JSZip 동적 로드
    let JSZip: any;
    try {
      const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' as any);
      JSZip = mod.default ?? (window as any).JSZip;
    } catch {
      JSZip = (window as any).JSZip;
    }
    if (!JSZip) throw new Error('JSZip 로드 실패. 인터넷 연결을 확인하세요.');

    setProgress('ZIP 파일 파싱...');
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // data.json 읽기
    setProgress('data.json 로드...');
    const jsonFile = zip.file('data.json');
    if (!jsonFile) throw new Error('ZIP 안에 data.json이 없습니다');
    const jsonText = await jsonFile.async('text');
    let data = JSON.parse(jsonText);

    // media/ 파일 → Blob URL 변환
    const blobMap = new Map<string, string>();
    const mediaFiles = Object.keys(zip.files).filter(k =>
      k.startsWith('media/') && !zip.files[k].dir
    );

    setProgress(`미디어 파일 변환 중... 0/${mediaFiles.length}`);
    let done = 0;
    for (const path of mediaFiles) {
      const blob = await zip.files[path].async('blob');
      blobMap.set(path, URL.createObjectURL(blob));
      done++;
      if (done % 5 === 0) {
        setProgress(`미디어 파일 변환 중... ${done}/${mediaFiles.length}`);
      }
    }

    // URL 경로 → Blob URL 치환
    setProgress('URL 매핑 중...');
    data = remapUrls(data, blobMap);

    setProgress('완료!');
    return data;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setError(""); setProgress("");

    try {
      let data: any;
      if (file.name.endsWith('.zip')) {
        data = await loadZip(file);
      } else {
        const text = await file.text();
        data = JSON.parse(text);
      }
      onLoad(data);
    } catch (err: any) {
      setError(err.message ?? '파일 로드 실패');
    } finally {
      setLoading(false); setProgress("");
    }
  };

  if (showCredits) {
    return <CinematicCredits onFinish={() => setShowCredits(false)}/>;
  }

  return (
    <div className="min-h-screen bg-[#060410] flex flex-col items-center justify-between p-8"
      style={{background:"linear-gradient(180deg,#060410 0%,#0d0b1a 50%,#060410 100%)"}}>

      {/* 상단: 로고 + 팀명 */}
      <div className="flex flex-col items-center gap-3 pt-8">
        <img src="/queen.png" alt="Millennium Session"
          className="w-14 h-14 object-contain opacity-80"
          onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
        <div className="text-center">
          <p className="text-amber-400/60 text-[9px] tracking-[0.5em] uppercase">Millennium Session</p>
          <div className="flex gap-3 mt-1.5 justify-center">
            <a href={LINKS.home} target="_blank" rel="noreferrer"
              className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-wider uppercase">홈페이지</a>
            <span className="text-gray-700">·</span>
            <a href={LINKS.community} target="_blank" rel="noreferrer"
              className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-wider uppercase">커뮤니티</a>
            <span className="text-gray-700">·</span>
            <a href={LINKS.team} target="_blank" rel="noreferrer"
              className="text-[9px] text-gray-600 hover:text-amber-400 transition tracking-wider uppercase">팀 소개</a>
          </div>
        </div>
      </div>

      {/* 중앙: 파일 불러오기 */}
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="text-center">
          <img src="/queen.png" alt="logo"
            className="w-16 h-16 object-contain mx-auto mb-3 opacity-90"
            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          <h1 className="text-4xl text-[#fbbf24] font-bold mb-1"
            style={{fontFamily:"Cinzel,serif",letterSpacing:"0.1em"}}>
            Tactical Nova
          </h1>
          <p className="text-gray-600 text-xs tracking-[0.4em] uppercase">Runner v1.0</p>
        </div>

        <label className="w-full cursor-pointer rounded-2xl border-2 border-dashed
          border-amber-400/25 bg-amber-400/03 p-8 hover:border-amber-400/50
          hover:bg-amber-400/08 transition text-center">
          <span className="text-5xl block mb-3">
            {loading ? '⏳' : '📂'}
          </span>
          <p className="text-gray-200 font-medium text-sm">게임 파일 불러오기</p>
          <p className="text-gray-600 text-xs mt-1">
            .zip 번들 또는 .json 파일
          </p>
          <input type="file" accept=".json,.zip" onChange={handleFile} className="sr-only"
            disabled={loading}/>
        </label>

        {/* 진행 상태 */}
        {loading && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"/>
              <p className="text-amber-400 text-sm">{progress || '로딩 중...'}</p>
            </div>
            <div className="w-full bg-black/40 rounded-full overflow-hidden h-1">
              <div className="h-full bg-amber-400/60 rounded-full animate-pulse" style={{width:'60%'}}/>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* 안내 */}
        <div className="w-full rounded-xl border border-amber-200/10 bg-black/20 p-3 space-y-1">
          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">불러오기 방법</p>
          <p className="text-[9px] text-stone-600">
            📦 ZIP: 에디터 → ZIP 번들 내보내기 → 여기서 불러오기
          </p>
          <p className="text-[9px] text-stone-600">
            📄 JSON: 에디터 → JSON 내보내기 → 여기서 불러오기
          </p>
        </div>
      </div>

      {/* 하단: 크레딧 버튼 */}
      <div className="flex flex-col items-center gap-2 pb-4">
        <button onClick={() => setShowCredits(true)}
          className="text-[10px] text-gray-700 hover:text-amber-400/70 transition
            tracking-[0.35em] uppercase border-b border-gray-800 hover:border-amber-400/30 pb-0.5">
          Production Credits
        </button>
        <p className="text-[9px] text-gray-800">© 2026 Millennium Session</p>
      </div>
    </div>
  );
}