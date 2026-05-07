/**
 * BattleGround.tsx v2
 * 수정1: 오디오 BattleGround에서 중앙 관리
 *        나가기/재시작 시 완전 정지
 *        음소거 버튼 정상 작동
 * 수정2: 새 레이아웃 (원형 초상화 + 대기창)
 */
import { useState, useRef, useEffect } from 'react';
import type { RunnerExportData, CardDefinition, GameMap } from '../types';
import BattleIntro   from './BattleIntro';
import BattleField   from './BattleField';
import './battle.css';
import BattleHero    from './BattleHero';

// UI 클릭음
const playUiSfx=()=>{
  try{const a=new Audio('/assets/audio/btn_sound01.mp3');a.volume=0.4;a.play().catch(()=>{});}catch{}
};
import BattleModal   from './BattleModal';
import { useBattle } from './useBattle';
import type { BattleUnit } from './BattleEngine';
import type { ZoomLevel } from './BattleCard';
import type { CollectionData } from '../CollectionScreen/useCollection';

// ── 모듈 레벨 오디오 싱글톤 (중복 방지) ──────────────────
let _bgm: HTMLAudioElement | null = null;
function stopGlobalBgm() {
  if (_bgm) { _bgm.pause(); _bgm.src = ''; _bgm = null; }
}
function playGlobalBgm(url: string, volume: number) {
  stopGlobalBgm();
  _bgm = new Audio(url);
  _bgm.loop = true;
  _bgm.volume = volume;
  _bgm.play().catch(() => {});
}
function setGlobalMute(muted: boolean) {
  if (_bgm) _bgm.muted = muted;
}
function setGlobalVolume(v: number) {
  if (_bgm) _bgm.volume = Math.max(0, Math.min(1, v));
}

interface Props {
  data:   RunnerExportData;
  map:    GameMap | null;
  onBack: () => void;
  playerCards?: CardDefinition[];
  onAddStars?: (n:number) => void;
  onHeroBonus?: (stat:'attack'|'defense', amount:number) => void;
  onOpenCollection?: () => void;   // App 레벨 컬렉션 오버레이 열기
  collectionData: CollectionData;
  onSetHeroName: (name:string) => void;
  onSetHeroCard: (uid:string) => void;
  onToggleDeck: (uid:string) => void;
  onCombine: (uid1:string, uid2:string) => void;
  onGacha: (rarity:'normal'|'bronze'|'silver'|'gold') => void;
  onUpgradeStat: (stat:'attack'|'defense'|'health') => void;
  stars: number;
}

export default function BattleGround({
  data, map, onBack,
  playerCards: propPlayerCards,
  onAddStars, onHeroBonus, onOpenCollection,
  collectionData, onSetHeroName, onSetHeroCard,
  onToggleDeck, onCombine, onGacha, onUpgradeStat, stars,
}: Props) {
  const [introDone,    setIntroDone]    = useState(false);
  const [zoom,         setZoom]         = useState<ZoomLevel>(200);
  const [sfxOn,        setSfxOn]        = useState(true);
  const [muted,        setMuted]        = useState(false);
  const [modalUnit,    setModalUnit]    = useState<BattleUnit|null>(null);
  const [logExpanded,  setLogExpanded]  = useState(false);
  const [modalEnabled, setModalEnabled] = useState(true); // 카드 정보창 ON/OFF
  const logRef = useRef<HTMLDivElement>(null);
  const bonusApplied = useRef(false); // ← early return 앞으로 이동

  // 덱 카드
  const npcDeck    = data.decks.find(d=>d.id===(map as any)?.npcDeckId)
                  ?? data.decks.find(d=>d.deckType==='npc');
  const playerDeck = data.decks.find(d=>d.id===(map as any)?.playerDeckId)
                  ?? data.decks.find(d=>d.deckType==='user');

  // 맵별 출전 카드 수 (스토리탭 설정, 기본 12장)
  const npcCardCount    = (map as any)?.npcCardCount    ?? 12;
  const playerCardCount = (map as any)?.playerCardCount ?? 12;

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(()=>Math.random()-0.5);

  // NPC 카드 구성
  const npcAllCards = (npcDeck?.cardIds
    .map(id=>data.cards.find(c=>c.id===id)).filter(Boolean)??[]) as CardDefinition[];
  const npcCards = shuffle(npcAllCards).slice(0, npcCardCount);

  // ── 플레이어 카드 구성 ───────────────────────────────────
  // 1) 컬렉션 activeDeck 우선
  // 2) 없으면 스토리탭 지정 덱 → N장 랜덤
  const rawPlayerCards: CardDefinition[] = propPlayerCards?.length
    ? propPlayerCards
    : (playerDeck?.cardIds
        .map(id=>data.cards.find(c=>c.id===id)).filter(Boolean)??[]) as CardDefinition[];

  // 주인공 카드 (맵 설정 or isHero 태그)
  const heroCardIds: string[] = (map as any)?.heroCardIds ?? [];
  const heroCards = heroCardIds.length > 0
    ? heroCardIds.map(id=>data.cards.find(c=>c.id===id)).filter(Boolean) as CardDefinition[]
    : rawPlayerCards.filter(c=>(c as any).isHero).slice(0, 5);

  // 일반 카드 = 주인공 제외 나머지에서 랜덤
  const nonHeroCards = rawPlayerCards.filter(
    c => !heroCards.some(h=>h.id===c.id)
  );
  const fillCount  = Math.max(0, playerCardCount - heroCards.length);
  const filledCards = shuffle(nonHeroCards).slice(0, fillCount);

  // 최종 플레이어 카드: 주인공 + 일반카드
  const playerCards: CardDefinition[] = [...heroCards, ...filledCards];

  const [speed, setSpeed] = useState<1|2>(2); // 기본 2배속

  const {
    state, isAuto, setIsAuto,
    selectedUid, setSelectedUid, isBusy,
    playerAttack,
    placeUnit,
    reservePlayer, reserveNpc, addFromReserve,
    starPlayer, starNpc,
  } = useBattle({ playerCards, npcCards, sfxOn, speed });

  useEffect(()=>{
    if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight;
  },[state.log]);

  // 컴포넌트 언마운트 시 BGM 정지
  useEffect(()=>()=>stopGlobalBgm(),[]);

  // 음소거 동기화
  useEffect(()=>setGlobalMute(muted),[muted]);

  // 입장 완료 → BGM 시작
  const handleIntroComplete = useCallback(()=>{
    setIntroDone(true);
    const bgmUrl = (map as any)?.bgmUrl || data.runner?.titleScreen?.bgmUrl;
    if (bgmUrl) playGlobalBgm(bgmUrl, 0.45);
  },[map, data]);

  // 나가기
  const handleBack = useCallback(()=>{
    stopGlobalBgm();
    onBack();
  },[onBack]);

  // ── 결과 보너스: early return 앞에 위치 (Rules of Hooks) ───
  useEffect(() => {
    if ((state.phase==='result' || state.winner) && !bonusApplied.current) {
      bonusApplied.current = true;
      if (state.winner==='player') {
        const bonus = Math.random()<0.5 ? 'attack' : 'defense';
        onHeroBonus?.(bonus, 1);
        onAddStars?.(5);
      }
    }
  }, [state.phase, state.winner]);

  // ── 입장 연출 ─────────────────────────────────────────────
  if (!introDone) {
    return (
      <BattleIntro
        data={data} map={map}
        onComplete={handleIntroComplete}
      />
    );
  }

  // ── 결과 화면 ─────────────────────────────────────────────
  if (state.phase==='result' || state.winner) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-5">
        <p className="text-6xl">{state.winner==='player'?'🏆':'💀'}</p>
        <h2 className="text-white text-3xl font-bold" style={{fontFamily:'Cinzel,serif'}}>
          {state.winner==='player' ? '승리!' : '패배...'}
        </h2>
        <p className="text-gray-500 text-sm">{state.turnNum}턴</p>
        {state.winner==='player' && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/05 px-4 py-2 text-center">
            <p className="text-[10px] text-amber-300">✨ 클리어 보너스</p>
            <p className="text-[9px] text-gray-400 mt-0.5">주인공 스탯 +1 · 별 +10</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleBack}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#060410]
              bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] active:scale-95 transition">
            ← 맵으로
          </button>
          {state.winner==='player' && (
            <button onClick={()=>onOpenCollection?.()}
              className="px-6 py-2.5 rounded-xl font-bold text-sm border border-amber-400/40
                text-amber-300 hover:bg-amber-400/10 active:scale-95 transition">
              📦 컬렉션
            </button>
          )}
        </div>
      </div>
    );
  }

  const phaseLabel: Record<string,string> = {
    setup:'배치',squad1:'1군 전투',squad1_end:'복귀',squad2:'2군 전투',free:'전면전',
  };

  return (
    <div className="flex flex-col h-screen bg-[#060410] overflow-hidden"
      style={map?.backgroundUrl?{
        backgroundImage:`url(${map.backgroundUrl})`,
        backgroundSize:'cover', backgroundPosition:'center'
      }:{}}>
      {map?.backgroundUrl && <div className="absolute inset-0 bg-black/65 z-0"/>}

      {/* ── NPC 대기창 (상단) ── */}
      <div className="relative z-10 flex-shrink-0">
        <BattleHero
          playerUnits={state.playerUnits}
          npcUnits={state.npcUnits}
          heroCards={heroCards}
          npcHeroId={(map as any)?.npcHeroId}
          reservePlayer={reservePlayer}
          reserveNpc={reserveNpc}
          starPlayer={starPlayer}
          starNpc={starNpc}
          turn={state.turn}
          isBusy={isBusy}
          side="npc"
          onOpenModal={setModalUnit}
          onAddFromReserve={addFromReserve}
        />
      </div>

      {/* ── 전장 ── */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <BattleField
          playerUnits={state.playerUnits}
          npcUnits={state.npcUnits}
          zoom={zoom}
          turn={state.turn}
          isBusy={isBusy}
          selectedUid={selectedUid}
          onSelectUnit={setSelectedUid}
          onOpenModal={u=>{ if(modalEnabled) setModalUnit(u); }}
          onPlaceUnit={placeUnit}
          onAttack={playerAttack}
          bubbles={state.bubbles}
        />
      </div>

      {/* ── 플레이어 대기창 (하단) ── */}
      <div className="relative z-10 flex-shrink-0">
        <BattleHero
          playerUnits={state.playerUnits}
          npcUnits={state.npcUnits}
          heroCards={heroCards}
          npcHeroId={(map as any)?.npcHeroId}
          reservePlayer={reservePlayer}
          reserveNpc={reserveNpc}
          starPlayer={starPlayer}
          starNpc={starNpc}
          turn={state.turn}
          isBusy={isBusy}
          side="player"
          onOpenModal={u=>{ if(modalEnabled) setModalUnit(u); }}
          onAddFromReserve={addFromReserve}
          onOpenCollection={()=>{ onOpenCollection?.(); }}
        />
      </div>

      {/* ── 상태바 ── */}
      <div className="relative z-10 flex-shrink-0 border-t border-amber-400/15 bg-black/80 px-3 py-1.5">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] px-2 py-0.5 rounded-full ${
            state.turn==='player'?'bg-green-500/20 text-green-300':'bg-stone-800 text-stone-500'
          }`}>{state.turn==='player'?'▶ 내 턴':'⏳ NPC 턴'}</span>
          <span className="text-[9px] text-amber-400/50">
            {phaseLabel[state.phase]??state.phase} · 턴 {state.turnNum}
          </span>
          <span className="text-[9px] text-stone-500">
            {selectedUid?'🎯 공격 대상 선택':'카드 선택'}
          </span>
        </div>
      </div>

      {/* ── 배틀 로그 (클릭 시 확장) ── */}
      <div className="relative z-10 flex-shrink-0 border-t border-white/05">
        <button
          onClick={()=>setLogExpanded(e=>!e)}
          className={`w-full bg-black/90 px-3 py-1 text-left transition-all ${
            logExpanded ? 'max-h-40 overflow-y-auto' : 'max-h-10 overflow-hidden'
          }`}>
          {logExpanded
            ? state.log.slice(-15).map((l,i)=>(
                <p key={i} className="text-[9px] text-gray-500 font-mono leading-relaxed">{l}</p>
              ))
            : <p className="text-[9px] text-gray-500 font-mono truncate">
                {state.log[state.log.length-1] ?? '전투 대기 중...'} <span className="text-gray-700">▼</span>
              </p>
          }
        </button>
      </div>

      {/* ── 컨트롤 ── */}
      <div className="relative z-10 flex-shrink-0 h-12 flex items-center
        justify-between px-2 gap-1.5 bg-[#060410] border-t border-amber-400/25">

        {/* 카드 정보창 ON/OFF */}
        <button onClick={()=>setModalEnabled(m=>!m)}
          className={`flex items-center gap-1 px-2 py-1.5 text-[9px] rounded-lg border font-bold transition ${
            modalEnabled
              ?'border-amber-400/50 bg-amber-400/10 text-amber-300'
              :'border-gray-700 text-gray-600'
          }`}>
          🃏 {modalEnabled?'ON':'OFF'}
        </button>

        {/* 음소거 */}
        <button onClick={()=>setMuted(m=>!m)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm
            transition ${muted?'border-red-500/50 bg-red-500/10 text-red-400':'border-gray-700 text-gray-400'}`}>
          {muted?'🔇':'🔊'}
        </button>

        {/* 나가기 */}
        <button onClick={handleBack}
          className="px-2.5 py-1.5 text-[9px] rounded-lg border border-gray-700 text-gray-500">
          ← 나가기
        </button>

        {/* 자동/정지 */}
        <button onClick={()=>{ playUiSfx(); setIsAuto(a=>!a); }}
          className={`px-2.5 py-1.5 text-[9px] rounded-lg border font-bold transition ${
            isAuto?'border-teal-400/60 bg-teal-400/10 text-teal-300':'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}>
          {isAuto?'⏸ 정지':'⏩ 자동'}
        </button>

        {/* 배속 */}
        <button onClick={()=>setSpeed(s=>s===2?1:2)}
          className={`px-2.5 py-1.5 text-[9px] rounded-lg border font-bold transition ${
            speed===1?'border-amber-400/60 bg-amber-400/10 text-amber-300':'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}>
          {speed===1?'🐢 1x':'⚡ 2x'}
        </button>

        {/* 줌 */}
        <div className="flex bg-black rounded-full p-0.5 border border-amber-400/25">
          {([50,200,400] as ZoomLevel[]).map(z=>(
            <button key={z} onClick={()=>setZoom(z)}
              className={`px-1.5 py-1 text-[8px] rounded-full transition ${
                zoom===z?'bg-amber-500 text-black font-bold':'text-amber-400/50'
              }`}>{z}%</button>
          ))}
        </div>
      </div>

      {/* 카드 모달 */}
      {modalUnit && modalEnabled && (
        <BattleModal unit={modalUnit} onClose={()=>setModalUnit(null)}/>
      )}
    </div>
  );
}
