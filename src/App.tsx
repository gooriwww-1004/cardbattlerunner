/**
 * Card Battle Runner App v2
 * 재미나이 디자인 + 실제 데이터 통합
 * 줌 시스템 (100/300/500) + 배틀 실제 카드 표시
 */
import React, { useState, useEffect, useRef } from 'react';
import type { RunnerExportData, CardDefinition, GameMap, ScriptScene } from './types';
import TopBar from './TopBar';
import LoadScreen from './LoadScreen';
import BattleGround from './battle/BattleGround';
import CollectionScreen from './CollectionScreen/CollectionScreen';
import { useCollection } from './CollectionScreen/useCollection';
import NarrationScreen from './NarrationScreen';
import LandingPage from './LandingPage';

const GOLD   = "bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-[#060410] font-bold";
const GOLD_S = "shadow-[0_0_15px_rgba(251,191,36,0.4)]";
const CB     = "border border-amber-400/60 bg-[#1a1625]";
const EI: Record<string,string> = {fire:"🔥",water:"💧",wind:"🌬️",light:"✨",dark:"🌑",earth:"🪨"};
// ── 상수 ──────────────────────────────────────────────────

// 눈 파티클
// 눈 또는 비 랜덤 효과
const WEATHER_TYPE = Math.random() > 0.5 ? "snow" : "rain";

function WeatherEffect() {
  if (WEATHER_TYPE === "rain") {
    // 비: 가늘고 빠르게 대각선
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {Array.from({length:60}).map((_,i)=>(
          <div key={i} className="absolute bg-blue-200/40 rounded-full"
            style={{
              width:"1px", height:`${8+Math.random()*14}px`,
              left:`${Math.random()*110}%`,
              top:`${Math.random()*100}%`,
              transform:"rotate(15deg)",
              animation:`rain${i%6} ${0.4+Math.random()*0.4}s linear ${Math.random()*2}s infinite`,
            }}/>
        ))}
        <style>{[0,1,2,3,4,5].map(i=>`
          @keyframes rain${i}{
            0%  {transform:rotate(15deg) translateY(-20px);opacity:.7}
            100%{transform:rotate(15deg) translateY(900px);opacity:0}
          }
        `).join('')}</style>
      </div>
    );
  }
  // 눈: 동글동글 천천히
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {Array.from({length:35}).map((_,i)=>(
        <div key={i} className="absolute rounded-full bg-white"
          style={{
            width:`${1.5+Math.random()*3}px`, height:`${1.5+Math.random()*3}px`,
            left:`${Math.random()*100}%`, opacity:0.3+Math.random()*0.5,
            animation:`sf${i%5} ${4+Math.random()*5}s linear ${Math.random()*6}s infinite`,
          }}/>
      ))}
      <style>{[0,1,2,3,4].map(i=>`
        @keyframes sf${i}{
          0%  {transform:translateY(-10px) translateX(0);opacity:.8}
          100%{transform:translateY(900px) translateX(${(i%2?1:-1)*(15+i*8)}px);opacity:0}
        }
      `).join('')}</style>
    </div>
  );
}

// 스크립트 씬
function ScriptPlayer({scenes,cards,onDone}:{scenes:ScriptScene[];cards:CardDefinition[];onDone:()=>void}) {
  const [idx,setIdx]=useState(0);
  const [vis,setVis]=useState(false);
  const [noCard,setNoCard]=useState(false);

  useEffect(()=>{
    if(!scenes?.length){ onDone(); return; }
    const t=setTimeout(()=>setVis(true),(scenes[idx]?.delay||0)*1000);
    return()=>clearTimeout(t);
  },[idx]);

  // 렌더 중 onDone 금지 → useEffect로
  useEffect(()=>{
    if(noCard) onDone();
  },[noCard]);

  if(!scenes?.length) return null;
  const sc=scenes[idx];
  const card=cards.find(c=>c.id===sc.characterCardId);

  // 카드 없으면 렌더 후 onDone
  if(!card){
    if(!noCard) setTimeout(()=>setNoCard(true),0);
    return null;
  }
  return(
    <div className="absolute inset-0 z-50 pointer-events-none">
      <div className={`absolute bottom-28 left-4 transition-all duration-500 ${vis?"opacity-100 translate-y-0":"opacity-0 translate-y-6"}`}>
        <div className="w-20 h-28 rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
          {card.imageUrl?<img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover"/>
            :<div className="w-full h-full bg-gradient-to-br from-amber-700 to-stone-900 flex items-center justify-center text-3xl">{EI[card.element]||"⚔️"}</div>}
        </div>
        <p className="text-[10px] text-amber-200 text-center mt-1 font-bold">{card.name}</p>
      </div>
      <div className={`absolute bottom-4 left-4 right-4 pointer-events-auto transition-all duration-400 ${vis?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`}>
        <div className="rounded-2xl border border-amber-200/20 bg-black/90 backdrop-blur px-4 py-3">
          <p className="text-white text-sm leading-relaxed">{sc.dialogue}</p>
          <button onClick={()=>{setVis(false);setTimeout(()=>{if(idx+1<scenes.length)setIdx(i=>i+1);else onDone();},300);}}
            className="mt-2 text-amber-400/70 text-xs float-right">다음 ▶</button>
        </div>
      </div>
    </div>
  );
}

// 1. 시작화면
function TitleScreen({data,onStart}:{data:RunnerExportData;onStart:()=>void}) {
  const bg    = data.runner?.titleScreen?.bgUrl ?? '';
  const bgmUrl= data.runner?.titleScreen?.bgmUrl ?? '';

  // 타이틀 BGM
  useEffect(()=>{
    if(!bgmUrl) return;
    const a=new Audio(bgmUrl);
    a.loop=true; a.volume=0.4;
    a.play().catch(()=>{});
    return()=>{ a.pause(); a.currentTime=0; };
  },[bgmUrl]);
  return(
    <div className="relative flex-1 flex flex-col items-center justify-between py-20 px-6 overflow-hidden"
      style={{background:bg?`url(${bg}) center/cover no-repeat`:"linear-gradient(180deg,#0a0b18,#1a1b30 50%,#0a0b18)"}}>
      <div className="absolute inset-0 bg-black/50 z-0"/>
      <WeatherEffect/>
      <div className="z-20 mt-16 text-center">
        <h1 className="text-5xl text-[#fbbf24] tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]"
          style={{fontFamily:"Cinzel,serif",lineHeight:1.2}}>
          {data.meta.title || "Tactical Nova"}
        </h1>
        <p className="text-amber-200/50 text-xs tracking-[0.3em] uppercase mt-3">{data.meta.author}</p>
      </div>
      <div className="z-20 w-full flex flex-col gap-3">
        <button onClick={onStart} className={`w-full py-4 rounded-xl text-lg uppercase tracking-widest ${GOLD} ${GOLD_S} transition active:scale-95`}>▶ 시작하기</button>
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl bg-[#1a1625] border border-gray-600 text-sm text-gray-300">로그인</button>
          <button className="flex-1 py-2.5 rounded-xl bg-[#1a1625] border border-gray-600 text-sm text-gray-300">게스트</button>
        </div>
        <p className="text-center text-[10px] text-gray-600">v{data.meta.version}</p>
      </div>
    </div>
  );
}

// 2. 맵화면
function MapScreen({data,onBattle,onDeck,onGacha,onSettings}:{data:RunnerExportData;onBattle:(m:GameMap)=>void;onDeck:()=>void;onGacha:()=>void;onSettings:()=>void}) {
  const [openChIds, setOpenChIds] = useState<Set<string>>(
    ()=>new Set(data.chapters[0]?.id ? [data.chapters[0].id] : [])
  );
  const [selMap,   setSelMap]   = useState<GameMap|null>(null);
  const [script,   setScript]   = useState<GameMap|null>(null);
  const [muted,    setMuted]    = useState(false);
  const bgmRef = useRef<HTMLAudioElement|null>(null);

  // 타이틀 BGM 맵 화면에서도 계속 재생
  const bgmUrl = data.runner?.titleScreen?.bgmUrl ?? '';
  useEffect(()=>{
    if(!bgmUrl) return;
    const a = new Audio(bgmUrl);
    a.loop=true; a.volume=muted?0:0.4;
    a.play().catch(()=>{});
    bgmRef.current = a;
    return()=>{ a.pause(); a.currentTime=0; };
  },[bgmUrl]);

  // 음소거 토글
  useEffect(()=>{
    if(bgmRef.current) bgmRef.current.volume = muted ? 0 : 0.4;
  },[muted]);

  // 현재 선택된 맵의 챕터명
  const currentChapter = selMap
    ? data.chapters.find(c => data.maps.filter(m=>(m as any).chapterId===c.id).some(m=>m.id===selMap.id))
    : data.chapters.find(c => openChIds.has(c.id));

  const headerTitle = currentChapter
    ? `${currentChapter.title}`
    : "Story Line";

  const toggleChapter = (id: string) => {
    setOpenChIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 맵별 주인공 카드 가져오기
  const getHeroCards = (map: GameMap) => {
    const heroIds: string[] = (map as any).heroCardIds ?? [];
    if (heroIds.length > 0) {
      // 개별 등록된 카드 우선
      return heroIds.map(id => data.cards.find(c=>c.id===id)).filter(Boolean) as any[];
    }
    // 플레이어 덱의 isHero 카드 폴백
    const playerDeckId = (map as any).playerDeckId;
    const deck = data.decks.find(d=>d.id===playerDeckId) ?? data.decks.find(d=>d.deckType==='user');
    if (!deck) return data.cards.filter(c=>(c as any).isHero).slice(0,5);
    return deck.cardIds
      .map(id=>data.cards.find(c=>c.id===id))
      .filter((c): c is any => !!c && (c as any).isHero)
      .slice(0,5);
  };

  const heroCards = selMap ? getHeroCards(selMap) : [];

  return(
    <div className="flex-1 flex flex-col bg-[#060410] overflow-hidden" style={{height:"100vh"}}>
      {script?.scripts?.length&&(
        <ScriptPlayer scenes={script.scripts!} cards={data.cards}
          onDone={()=>{onBattle(script!);setScript(null);}}/>
      )}

      {/* 헤더 — 현재 챕터명 유동 표시 */}
      <TopBar
        title={headerTitle}
        right={
          <div className="flex gap-1">
            {/* 음소거 버튼 */}
            <button onClick={()=>setMuted(m=>!m)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-amber-400/20 text-amber-400/70 text-sm">
              {muted ? '🔇' : '🔊'}
            </button>
            {([["🃏",onDeck],["✨",onGacha],["⚙️",onSettings]] as [string,()=>void][]).map(([icon,fn])=>(
              <button key={icon} onClick={fn}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-amber-400/20 text-amber-400/70 text-sm">
                {icon}
              </button>
            ))}
          </div>
        }
      />

      {/* 메인 가로 50:50 */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* 왼쪽 50% — 챕터 아코디언 */}
        <div className="w-1/2 flex flex-col border-r border-amber-400/15 overflow-y-auto">
          {data.chapters.map((ch, ci) => {
            const chMaps = data.maps.filter(m=>(m as any).chapterId===ch.id);
            const isOpen = openChIds.has(ch.id);
            return (
              <div key={ch.id}>
                {/* 챕터 헤더 버튼 */}
                <button
                  onClick={()=>toggleChapter(ch.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5
                    border-b border-amber-400/10 transition
                    ${isOpen ? 'bg-amber-400/08 text-amber-200' : 'text-gray-500 hover:text-gray-300 hover:bg-white/03'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold flex-shrink-0"
                      style={{fontFamily:'Cinzel,serif'}}>
                      {isOpen ? '▼' : '▶'}
                    </span>
                    <span className="text-[10px] font-bold truncate"
                      style={{fontFamily:'Cinzel,serif'}}>
                      Ch.{ci+1} {ch.title}
                    </span>
                  </div>
                  <span className="text-[9px] text-stone-600 flex-shrink-0 ml-1">
                    {chMaps.length}맵
                  </span>
                </button>

                {/* 맵 목록 — 아코디언 */}
                {isOpen && (
                  <div className="bg-black/20">
                    {chMaps.length === 0 ? (
                      <p className="text-[9px] text-gray-700 text-center py-3">맵 없음</p>
                    ) : chMaps.map(map => (
                      <button key={map.id} onClick={()=>setSelMap(map)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left
                          border-b border-white/04 transition active:scale-[0.99] ${
                          selMap?.id===map.id
                            ?'bg-amber-400/10 border-l-2 border-l-amber-400/60'
                            :'hover:bg-white/04'
                        }`}>
                        {/* 썸네일 */}
                        <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                          {map.backgroundUrl
                            ?<img src={map.backgroundUrl} alt="" className="w-full h-full object-cover"/>
                            :<div className="w-full h-full bg-stone-900 flex items-center justify-center text-base">🗺️</div>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-white truncate"
                            style={{fontFamily:'Cinzel,serif'}}>{map.title}</p>
                          <p className="text-[8px] text-amber-400/60 mt-0.5">Lv.{map.level}</p>
                          <p className="text-[8px] text-gray-600">
                            {{"rain":"🌧️","snow":"❄️","fog":"🌫️"}[map.weather as string]||"☀️"}
                            {(map.scripts?.length??0)>0 && ` 📜${map.scripts!.length}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 오른쪽 50% — 맵 상세 (80% 이미지 : 20% 텍스트) */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {selMap ? (
            <>
              {/* 이미지 80% */}
              <div className="relative flex-1 overflow-hidden">
                {selMap.backgroundUrl
                  ?<img src={selMap.backgroundUrl} alt={selMap.title}
                      className="w-full h-full object-cover"/>
                  :<div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-950
                      flex items-center justify-center">
                    <span className="text-5xl opacity-20">🗺️</span>
                  </div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent"/>
                <div className="absolute bottom-2 left-3 right-3">
                  <p className="text-white font-bold text-sm"
                    style={{fontFamily:'Cinzel,serif'}}>{selMap.title}</p>
                  <p className="text-amber-400/70 text-[9px] mt-0.5">
                    Level {selMap.level} ·
                    {{"rain":" 🌧️ 비","snow":" ❄️ 눈","fog":" 🌫️ 안개"}[selMap.weather as string]||" ☀️ 맑음"}
                  </p>
                </div>
              </div>

              {/* 텍스트+버튼 20% */}
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2
                bg-black/85 border-t border-amber-400/10"
                style={{minHeight:'56px',maxHeight:'68px'}}>
                <p className="flex-1 text-[9px] text-gray-500 leading-relaxed line-clamp-2 min-w-0">
                  {(selMap as any).description || "스테이지 설명 없음"}
                </p>
                <button
                  onClick={()=>{ if((selMap.scripts?.length??0)>0) setScript(selMap); else onBattle(selMap); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold
                    transition active:scale-95 ${GOLD} ${GOLD_S}`}
                  style={{fontFamily:'Cinzel,serif'}}>
                  ⚔️ 입장
                </button>
              </div>
            </>
          ):(
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
              <span className="text-4xl opacity-10">🗺️</span>
              <p className="text-[10px] text-gray-700 tracking-wider uppercase text-center">
                스테이지를 선택하세요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 — 맵별 주인공 카드 */}
      <div className="flex-shrink-0 border-t border-amber-400/15 bg-black/80"
        style={{height:'18%', minHeight:'68px'}}>
        <div className="flex items-center h-full px-3 gap-3">
          <div className="flex-shrink-0">
            <p className="text-[7px] text-amber-400/40 uppercase tracking-widest">
              {selMap ? '참여 카드' : '파티'}
            </p>
            {selMap && heroCards.length === 0 && (
              <p className="text-[6px] text-gray-700 mt-0.5">미설정</p>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto py-1 flex-1 items-center">
            {(selMap ? heroCards : data.cards.filter(c=>(c as any).isHero).slice(0,5))
              .map((c:any) => (
                <div key={c.id}
                  className="flex-shrink-0 rounded-xl overflow-hidden border-2
                    border-amber-400/30 hover:border-amber-400/70 transition hover:scale-105"
                  style={{width:'38px', height:'54px'}}>
                  {c.imageUrl
                    ?<img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover"/>
                    :<div className="w-full h-full bg-gradient-to-br from-amber-800 to-stone-900
                        flex items-center justify-center"
                      style={{fontSize:'16px'}}>
                      {EI[c.element]||'⚔️'}
                    </div>
                  }
                </div>
              ))
            }
            {/* 비어있을 때 기본 슬롯 */}
            {(selMap ? heroCards : data.cards.filter(c=>(c as any).isHero)).length === 0 &&
              [...Array(5)].map((_,i)=>(
                <div key={i}
                  className="flex-shrink-0 rounded-xl border border-gray-800 flex items-center justify-center"
                  style={{width:'38px', height:'54px'}}>
                  <span className="text-[8px] text-gray-700">{i+1}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. 덱
function DeckScreen({data,onBack}:{data:RunnerExportData;onBack:()=>void}) {
  const [selDeck,setSelDeck]=useState(data.decks.find(d=>d.deckType==="user")?.id??"");
  const deck=data.decks.find(d=>d.id===selDeck);
  const dc=(deck?.cardIds.map(id=>data.cards.find(c=>c.id===id)).filter(Boolean)??[]) as CardDefinition[];
  return(
    <div className="flex-1 flex flex-col bg-[#060410]">
      <TopBar title="덱 관리" onBack={onBack}/>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-28 border-r border-white/08 p-2 space-y-1 overflow-y-auto">
          {data.decks.filter(d=>d.deckType==="user").map(d=>(
            <button key={d.id} onClick={()=>setSelDeck(d.id)}
              className={`w-full text-left rounded-lg px-2 py-2 text-[10px] transition ${selDeck===d.id?"bg-amber-500/20 text-amber-200 border border-amber-400/50":"text-gray-400 hover:bg-white/05"}`}>{d.name}</button>
          ))}
        </aside>
        <main className="flex-1 p-2 overflow-y-auto">
          <p className="text-[9px] text-gray-600 mb-2">{dc.length}장</p>
          <div className="grid grid-cols-4 gap-1.5">
            {dc.map(c=>(
              <div key={c.id} className="rounded-lg overflow-hidden border border-amber-400/20" style={{aspectRatio:"3/4"}}>
                {c.imageUrl?<img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover"/>
                  :<div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center text-2xl">{EI[c.element]||"⚔️"}</div>}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// 5. 가차
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// 6. 설정
function SettingsScreen({onBack}:{onBack:()=>void}) {
  const [bgm,setBgm]=useState(70);
  const [sfx,setSfx]=useState(70);
  const [lang,setLang]=useState("ko");
  return(
    <div className="flex-1 flex flex-col bg-[#060410]">
      <TopBar title="⚙️ 설정" onBack={onBack}/>
      <div className="p-5 space-y-5 max-w-sm mx-auto w-full">
        {([["🎵 BGM",bgm,setBgm],["🔊 효과음",sfx,setSfx]] as [string,number,(v:number)=>void][]).map(([label,val,setter])=>(
          <div key={label}><div className="flex justify-between text-sm text-gray-300 mb-2"><span>{label}</span><span className="text-amber-400">{val}%</span></div>
          <input type="range" min={0} max={100} value={val} onChange={e=>setter(Number(e.target.value))} className="w-full accent-amber-400"/></div>
        ))}
        <div><p className="text-sm text-gray-300 mb-2">언어</p>
          <div className="flex gap-2">
            {[["ko","한국어"],["en","English"],["zh","中文"]].map(([code,name])=>(
              <button key={code} onClick={()=>setLang(code)}
                className={`flex-1 py-2 rounded-xl text-xs transition ${lang===code?"bg-amber-500/20 border border-amber-400/50 text-amber-200":"border border-gray-700 text-gray-500"}`}>{name}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 빈 배열 안정화 (매 렌더링마다 새 배열 생성 방지)
const EMPTY_CARDS: CardDefinition[] = [];

type Screen = "title" | "map" | "deck" | "settings";

export default function App() {
  const [data,setData]=useState<RunnerExportData|null>(null);
  const [screen,setScreen]=useState<Screen>("title");
  const [battleMap,setBattleMap]=useState<GameMap|null>(null);
  const [narrationMap,setNarrationMap]=useState<GameMap|null>(null);
  const [showCollection,setShowCollection]=useState(false);

  const collection = useCollection(data?.cards ?? EMPTY_CARDS);

  // 로컬 개발: 기존 LoadScreen 유지
  // 배포(Vercel): LandingPage 표시
  if(!data) {
    return import.meta.env.DEV
      ? <LoadScreen onLoad={setData}/>
      : <LandingPage onLoad={setData}/>;
  };

  // 맵 선택 → 나레이션 있으면 먼저, 없으면 바로 배틀
  const handleBattle = (m: GameMap) => {
    const script = (m as any).script ?? '';
    if (script.trim()) {
      setNarrationMap(m);
    } else {
      setBattleMap(m);
    }
  };

  const screens:Record<Screen,React.ReactNode>={
    title:
      <TitleScreen data={data} onStart={()=>setScreen("map")}/>,
    map:
      <MapScreen data={data}
        onBattle={handleBattle}
        onDeck={()=>setScreen("deck")}
        onGacha={()=>setShowCollection(true)}
        onSettings={()=>setScreen("settings")}/>,
    deck:
      <DeckScreen data={data} onBack={()=>setScreen("map")}/>,
    settings:
      <SettingsScreen onBack={()=>setScreen("map")}/>,
  };

  const collectionOverlayProps = {
    data: collection.data,
    stars: collection.data.stars,
    onBack: ()=>setShowCollection(false),
    onSetHeroName: collection.setHeroName,
    onSetHeroCard: collection.setHeroCard,
    onToggleDeck: collection.toggleActiveDeck,
    onCombine: collection.combineCards,
    onGacha: collection.gachaByStars,
    onUpgradeStat: collection.upgradeStat,
  };

  return (
    <div className="min-h-screen bg-[#060410] flex flex-col">

      {/* 나레이션 → 완료 시 배틀 시작 */}
      {narrationMap && (
        <NarrationScreen
          map={narrationMap}
          onComplete={()=>{ setBattleMap(narrationMap); setNarrationMap(null); }}
        />
      )}

      {/* 배틀 — battleMap 있으면 항상 마운트 */}
      {battleMap
        ?<BattleGround
            data={data} map={battleMap}
            playerCards={collection.getActiveDeckCards()}
            onBack={()=>setBattleMap(null)}
            onAddStars={collection.addStars}
            onHeroBonus={collection.addHeroBonus}
            onOpenCollection={()=>setShowCollection(true)}
            collectionData={collection.data}
            stars={collection.data.stars}
            onSetHeroName={collection.setHeroName}
            onSetHeroCard={collection.setHeroCard}
            onToggleDeck={collection.toggleActiveDeck}
            onCombine={collection.combineCards}
            onGacha={collection.gachaByStars}
            onUpgradeStat={collection.upgradeStat}
          />
        : screens[screen]
      }

      {/* 컬렉션 전역 오버레이 — 맵/배틀 어디서나 */}
      {showCollection && (
        <div className="fixed inset-0 z-[200]">
          <CollectionScreen {...collectionOverlayProps}/>
        </div>
      )}
    </div>
  );
}