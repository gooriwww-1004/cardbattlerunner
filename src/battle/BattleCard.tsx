/**
 * BattleCard.tsx
 * 배틀 카드 컴포넌트
 * - 줌 레벨별 크기
 * - 클릭 → 모달 트리거
 * - 드래그앤드롭 지원
 * - 상태이상 뱃지
 * - HP 바
 */
import React, { useRef } from 'react';
import type { BattleUnit } from './BattleEngine';

export type ZoomLevel = 50 | 200 | 400;

// 줌별 카드 크기
const ZOOM_SIZE: Record<ZoomLevel, { w: number; h: number; imgH: number; fontSize: number }> = {
  50:  { w: 32,  h: 44,  imgH: 34,  fontSize: 6  },
  200: { w: 72,  h: 100, imgH: 76,  fontSize: 8  },
  400: { w: 160, h: 221, imgH: 123, fontSize: 10 },
};

const EI: Record<string, string> = {
  fire:'🔥',water:'💧',wind:'🌬️',light:'✨',dark:'🌑',earth:'🪨'
};
const hpColor = (p: number) => p > 0.6 ? '#22c55e' : p > 0.3 ? '#eab308' : '#ef4444';

const ELEM_BG: Record<string, string> = {
  fire:  'from-red-900/90 via-orange-800/60 to-stone-950',
  water: 'from-blue-900/90 via-cyan-800/60 to-slate-950',
  wind:  'from-emerald-900/90 via-teal-700/50 to-slate-950',
  light: 'from-yellow-800/90 via-amber-700/50 to-stone-950',
  dark:  'from-violet-950/95 via-purple-800/60 to-slate-950',
  earth: 'from-amber-950/90 via-stone-800/60 to-stone-950',
};
const ELEM_BORDER: Record<string, string> = {
  fire:'border-orange-500/60', water:'border-cyan-400/60',
  wind:'border-emerald-400/60', light:'border-yellow-300/70',
  dark:'border-violet-400/60', earth:'border-amber-600/60',
};

interface Props {
  unit: BattleUnit;
  zoom: ZoomLevel;
  isEnemy?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  canDrag?: boolean;
  onSelect?: () => void;
  onOpenModal?: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

export default function BattleCard({
  unit, zoom,
  isEnemy=false, isSelected=false, isDragging=false, canDrag=false,
  onSelect, onOpenModal, onDragStart, onDragOver, onDrop,
}: Props) {
  const sz  = ZOOM_SIZE[zoom];
  const hp  = unit.currentHp / unit.card.health;
  const bg  = ELEM_BG[unit.card.element]   || ELEM_BG.fire;
  const bdr = ELEM_BORDER[unit.card.element]|| ELEM_BORDER.fire;

  const hasBuff   = unit.statuses.some(s=>s.type==='buff_atk'||s.type==='buff_def');
  const hasDebuff = unit.statuses.some(s=>s.type==='debuff_atk'||s.type==='debuff_def');
  const isStunned = unit.statuses.some(s=>s.type==='stun');
  const equipped  = ((unit.card as any).equippedAbilities??[]).length;

  const longPressTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onOpenModal?.();
    }, 600);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div
      id={`bu-${unit.uid}`}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragOver={e=>{ e.preventDefault(); onDragOver?.(); }}
      onDrop={e=>{ e.preventDefault(); onDrop?.(); }}
      onClick={()=>{ onSelect?.(); onOpenModal?.(); }}
      onDoubleClick={()=>{ onOpenModal?.(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        relative select-none rounded-lg border-2 overflow-visible flex-shrink-0
        transition-all duration-150 cursor-pointer
        bg-gradient-to-br ${bg} ${bdr}
        ${unit.isDead ? 'opacity-30 grayscale pointer-events-none' : ''}
        ${isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent' : ''}
        ${isEnemy && !unit.isDead ? 'hover:brightness-125' : ''}
        ${isDragging ? 'opacity-60 scale-105' : ''}
        ${hasBuff    ? 'shadow-[0_0_10px_rgba(34,197,94,0.7)]'  : ''}
        ${hasDebuff  ? 'shadow-[0_0_10px_rgba(168,85,247,0.7)]' : ''}
        ${isStunned  ? 'opacity-60' : ''}
      `}
      style={{ width:`${sz.w}px`, height:`${sz.h}px` }}
    >
      {/* 이미지 영역 */}
      <div className={`absolute top-0 left-0 right-0 overflow-hidden rounded-t-lg bg-gradient-to-br ${bg}`}
        style={{ height:`${sz.imgH}px` }}>
        {unit.card.imageUrl
          ? <img src={unit.card.imageUrl} alt={unit.card.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ fontSize: `${sz.w * 0.4}px` }}>
              {EI[unit.card.element]||'⚔️'}
            </div>
        }
        {unit.isDead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl">✝</div>
        )}
      </div>

      {/* 스탯 영역 */}
      <div className="absolute left-0 right-0 bottom-0 rounded-b-lg bg-black/90 px-0.5 py-0.5"
        style={{ height:`${sz.h - sz.imgH}px` }}>
        {zoom >= 200 && (
          <p className="text-white font-bold truncate text-center leading-none mb-0.5"
            style={{ fontSize:`${sz.fontSize}px` }}>
            {unit.card.name.substring(0, zoom===400 ? 10 : 6)}
          </p>
        )}
        {/* HP 바 */}
        <div className="w-full bg-black/60 rounded-full overflow-hidden"
          style={{ height: zoom>=200 ? '3px' : '2px' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width:`${hp*100}%`, backgroundColor: hpColor(hp) }}/>
        </div>
        {/* 스탯 숫자 (400% 이상) */}
        {zoom === 400 && (
          <div className="flex justify-between mt-0.5" style={{ fontSize:'7px' }}>
            <span style={{color:'#f87171'}}>⚔{unit.card.attack}</span>
            <span style={{color:'#60a5fa'}}>🛡{unit.card.defense}</span>
            <span style={{color:hpColor(hp)}}>❤{unit.currentHp}</span>
          </div>
        )}
      </div>

      {/* 뱃지 (overflow visible) */}
      {/* 공격타입 */}
      <div className="absolute -top-2 -left-2 bg-black/80 rounded-full flex items-center justify-center border border-white/20 z-10"
        style={{ width:'16px', height:'16px', fontSize:'9px' }}>
        {unit.card.attackType==='melee'?'⚔️':unit.card.attackType==='ranged'?'🏹':'🪄'}
      </div>
      {/* 스킬 장착 수 */}
      {equipped > 0 && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-black rounded-full flex items-center justify-center font-bold z-10"
          style={{ width:'14px', height:'14px', fontSize:'8px' }}>
          {equipped}
        </div>
      )}
      {/* 버프/디버프/기절 */}
      {hasBuff   && <div className="absolute -bottom-3 left-0 z-10" style={{fontSize:'9px'}}>📈</div>}
      {hasDebuff && <div className="absolute -bottom-3 right-0 z-10" style={{fontSize:'9px'}}>📉</div>}
      {isStunned && <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10" style={{fontSize:'10px'}}>⚡</div>}
      {/* 선택됨 */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 bg-amber-400 rounded-full border-2 border-black z-10"
          style={{ width:'12px', height:'12px' }}/>
      )}
    </div>
  );
}

// ── 빈 슬롯 컴포넌트 ─────────────────────────────────────
export function EmptySlot({
  zoom, isEnemy, isDragOver, onDragOver, onDragLeave, onDrop
}: {
  zoom: ZoomLevel;
  isEnemy?: boolean;
  isDragOver?: boolean;
  onDragOver?: (e:React.DragEvent)=>void;
  onDragLeave?: ()=>void;
  onDrop?: (e:React.DragEvent)=>void;
}) {
  const sz = ZOOM_SIZE[zoom];
  return (
    <div
      className={`rounded-lg border-2 border-dashed flex-shrink-0 transition-colors ${
        isDragOver && !isEnemy
          ? 'border-amber-400/80 bg-amber-400/15'
          : isEnemy
            ? 'border-red-900/20 bg-red-900/05'
            : 'border-white/10 bg-black/10'
      }`}
      style={{ width:`${sz.w}px`, height:`${sz.h}px` }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    />
  );
}
