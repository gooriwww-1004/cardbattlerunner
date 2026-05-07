/**
 * BattleHero.tsx v3
 * - 원형 플레임 초상화 (좌: 플레이어, 우: NPC)
 * - 가로 대기창 (예비 카드 스크롤)
 * - 별 게이지 (기본 구조)
 * - 카드 클릭 → 모달
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { BattleUnit } from './BattleEngine';
import type { CardDefinition } from '../types';
import BattleModal from './BattleModal';

interface Props {
  playerUnits: BattleUnit[];
  npcUnits:    BattleUnit[];
  heroCards:   CardDefinition[];
  npcHeroId?:  string;           // ← 스토리탭 설정 NPC 악역 주인공
  reservePlayer: BattleUnit[];
  reserveNpc:    BattleUnit[];
  starPlayer: number;
  starNpc:    number;
  turn: 'player' | 'npc';
  isBusy: boolean;
  side: 'player' | 'npc';
  onOpenModal: (unit: BattleUnit) => void;
  onAddFromReserve: (uid: string, side: 'player'|'npc') => void;
  onOpenCollection?: () => void;
}

const EI: Record<string,string> = {fire:'🔥',water:'💧',wind:'🌬️',light:'✨',dark:'🌑',earth:'🪨'};
const hpC = (p:number) => p>0.6?'#22c55e':p>0.3?'#eab308':'#ef4444';

// ── 원형 플레임 초상화 ────────────────────────────────────
function FlamePortrait({
  card, side, hp, maxHp, stars, onClick
}: {
  card: CardDefinition | null;
  side: 'player' | 'npc';
  hp: number; maxHp: number;
  stars: number;
  onClick: () => void;
}) {
  const hpRatio = maxHp > 0 ? hp / maxHp : 1;
  const flameColor = side==='player'
    ? 'from-blue-500 via-cyan-400 to-blue-600'
    : 'from-red-500 via-orange-400 to-red-600';
  const glowColor = side==='player'
    ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.6)';

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      {/* 원형 초상화 */}
      <button
        onClick={onClick}
        className="relative transition active:scale-95 group"
        style={{width:'52px', height:'52px'}}>
        {/* 플레임 링 */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${flameColor} p-[3px]`}
          style={{boxShadow:`0 0 12px ${glowColor}, 0 0 24px ${glowColor}40`}}>
          {/* 내부 원 이미지 */}
          <div className="w-full h-full rounded-full overflow-hidden bg-stone-900">
            {card?.imageUrl
              ? <img src={card.imageUrl} alt={card.name}
                  className="w-full h-full object-cover object-top"/>
              : <div className="w-full h-full flex items-center justify-center text-xl">
                  {card ? EI[card.element]||'⚔️' : '👤'}
                </div>
            }
          </div>
        </div>
        {/* 호버 힌트 */}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition"/>
      </button>

      {/* HP 바 */}
      <div className="w-12 bg-black/60 rounded-full overflow-hidden" style={{height:'2px'}}>
        <div className="h-full rounded-full transition-all"
          style={{width:`${hpRatio*100}%`, backgroundColor:hpC(hpRatio)}}/>
      </div>

      {/* 별 게이지 */}
      <div className="flex items-center gap-0.5">
        <span className="text-[8px]">⭐</span>
        <span className="text-[8px] text-amber-400 font-bold">{stars}</span>
      </div>
    </div>
  );
}

// ── 예비 카드 가로 스크롤 ────────────────────────────────
function ReserveStrip({
  units, side, turn, isBusy, onAddFromReserve, onOpenModal
}: {
  units: BattleUnit[];
  side: 'player' | 'npc';
  turn: string; isBusy: boolean;
  onAddFromReserve: (uid: string) => void;
  onOpenModal: (unit: BattleUnit) => void;
}) {
  const canDrag = side==='player' && turn==='player' && !isBusy;

  return (
    <div className="flex gap-1 overflow-x-auto py-0.5 flex-1 items-center"
      style={{scrollbarWidth:'none'}}>
      {units.length === 0 ? (
        <p className="text-[8px] text-gray-700 italic px-2">예비 없음</p>
      ) : units.map(u=>(
        <div
          key={u.uid}
          draggable={canDrag}
          onDragStart={e=>{
            if(canDrag){
              e.dataTransfer.setData('reserveUid', u.uid);
              e.dataTransfer.effectAllowed='move';
            }
          }}
          onClick={()=>onOpenModal(u)}
          className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition select-none ${
            canDrag
              ? 'border-amber-400/50 hover:border-amber-400 cursor-grab active:cursor-grabbing active:scale-110'
              : 'border-gray-700 opacity-60 cursor-default'
          }`}
          style={{width:'32px', height:'44px'}}>
          {u.card.imageUrl
            ?<img src={u.card.imageUrl} alt={u.card.name}
                className="w-full h-full object-cover pointer-events-none"/>
            :<div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-900
                flex items-center justify-center pointer-events-none"
              style={{fontSize:'14px'}}>{EI[u.card.element]||'⚔️'}</div>
          }
        </div>
      ))}
      {/* 드래그 힌트 */}
      {canDrag && units.length > 0 && (
        <p className="text-[7px] text-amber-400/30 flex-shrink-0 ml-1">
          드래그→배치
        </p>
      )}
    </div>
  );
}

export default function BattleHero({
  playerUnits, npcUnits, heroCards,
  npcHeroId,
  reservePlayer, reserveNpc,
  starPlayer, starNpc,
  turn, isBusy, side, onOpenModal, onAddFromReserve,
  onOpenCollection,
}: Props) {
  const [modalUnit, setModalUnit] = useState<BattleUnit|null>(null);

  const playerHeroUnit = playerUnits.find(u=>(u.card as any).isHero && !u.isDead)
    ?? playerUnits.find(u=>(u.card as any).isHero)
    ?? playerUnits[0] ?? null;

  // npcHeroId 우선 → isHero 카드 → 첫 번째 카드
  const npcHeroUnit = (npcHeroId
    ? npcUnits.find(u=>u.card.id===npcHeroId && !u.isDead)
      ?? npcUnits.find(u=>u.card.id===npcHeroId)
    : null)
    ?? npcUnits.find(u=>(u.card as any).isHero && !u.isDead)
    ?? npcUnits.find(u=>(u.card as any).isHero)
    ?? npcUnits[0] ?? null;

  const heroCard    = heroCards[0] ?? playerHeroUnit?.card ?? null;
  const npcHeroCard = npcHeroUnit?.card ?? null;

  const aliveP = playerUnits.filter(u=>!u.isDead).length;
  const aliveN = npcUnits.filter(u=>!u.isDead).length;

  const openModal = (unit: BattleUnit | null) => {
    if (unit) setModalUnit(unit);
  };

  return (
    <>
      {/* ── NPC 행 ── */}
      {side === 'npc' && (
        <div className="flex items-center gap-2 px-2 py-1.5
          border-b border-red-400/10 bg-black/70 flex-shrink-0">
          <FlamePortrait
            card={npcHeroCard} side="npc"
            hp={npcHeroUnit?.currentHp ?? 0}
            maxHp={npcHeroUnit?.card.health ?? 1}
            stars={starNpc}
            onClick={()=>openModal(npcHeroUnit)}
          />
          <div className="flex-shrink-0 text-center">
            <p className="text-[8px] text-red-400/60">🔴 {aliveN}</p>
            <p className="text-[7px] text-gray-700">적군</p>
          </div>
          <ReserveStrip
            units={reserveNpc} side="npc"
            turn={turn} isBusy={isBusy}
            onAddFromReserve={uid=>onAddFromReserve(uid,'npc')}
            onOpenModal={openModal}
          />
        </div>
      )}

      {/* ── 플레이어 행 ── */}
      {side === 'player' && (
        <div className="flex items-center gap-2 px-2 py-1.5
          border-t border-blue-400/10 bg-black/70 flex-shrink-0">
          <FlamePortrait
            card={heroCard} side="player"
            hp={playerHeroUnit?.currentHp ?? 0}
            maxHp={playerHeroUnit?.card.health ?? 1}
            stars={starPlayer}
            onClick={()=>{
              // 컬렉션 연결 우선, 없으면 카드 상세
              if(onOpenCollection) onOpenCollection();
              else openModal(playerHeroUnit);
            }}
          />
          <div className="flex-shrink-0 text-center">
            <p className="text-[8px] text-blue-400/60">🟢 {aliveP}</p>
            <p className="text-[7px] text-gray-700">아군</p>
          </div>
          <ReserveStrip
            units={reservePlayer} side="player"
            turn={turn} isBusy={isBusy}
            onAddFromReserve={uid=>onAddFromReserve(uid,'player')}
            onOpenModal={openModal}
          />
          {turn==='player' && !isBusy && reservePlayer.length > 0 && (
            <p className="text-[7px] text-amber-400/50 flex-shrink-0">탭→배치</p>
          )}
        </div>
      )}

      {modalUnit && createPortal(
        <BattleModal unit={modalUnit} onClose={()=>setModalUnit(null)}/>,
        document.body
      )}
    </>
  );
}