/**
 * BattleField.tsx
 * 배틀 필드 레이아웃
 * 50%:  1군+2군 한 화면에 표시
 * 200%+: 단일군 + 좌우 화살표 전환
 */
import { useState } from 'react';
import type { BattleUnit, SpeechBubble } from './BattleEngine';
import BattleCard, { EmptySlot } from './BattleCard';
import type { ZoomLevel } from './BattleCard';

interface Props {
  playerUnits: BattleUnit[];
  npcUnits: BattleUnit[];
  zoom: ZoomLevel;
  turn: 'player' | 'npc';
  isBusy: boolean;
  selectedUid: string | null;
  onSelectUnit: (uid: string | null) => void;
  onOpenModal: (unit: BattleUnit) => void;
  onPlaceUnit: (uid: string, squad: 1|2, row: number, col: number) => void;
  onAttack: (atkUid: string, defUid: string) => void;
  bubbles?: SpeechBubble[];
}

// ── 말풍선 컴포넌트 (NPC / Player 분리) ──────────────────
function SpeechBubbleBox({
  bubble, zoom
}: {
  bubble: SpeechBubble | null;
  zoom: ZoomLevel;
  position: 'top' | 'bottom';
}) {
  if (!bubble) return null;

  const isNpc = bubble.side === 'npc';
  const fontSize = zoom===50 ? 12 : zoom===200 ? 9 : 8;
  const padding  = zoom===50 ? 'px-3 py-1.5' : 'px-2 py-1';

  // NPC=빨강, Player=파랑
  const color     = isNpc ? '#fca5a5' : '#93c5fd';
  const bgColor   = isNpc ? 'rgba(127,29,29,0.85)' : 'rgba(30,58,138,0.85)';
  const borderClr = isNpc ? 'rgba(239,68,68,0.5)'  : 'rgba(59,130,246,0.5)';
  const TYPE_ICON: Record<string, string> = {
    skill:'✨', battle:'⚔️', death:'💀', victory:'🏆',
  };

  return (
    <div
      className={`${padding} rounded-xl text-center backdrop-blur-sm
        animate-in zoom-in-95 duration-200 pointer-events-none`}
      style={{
        background: bgColor,
        border: `1px solid ${borderClr}`,
        boxShadow: `0 0 12px ${borderClr}`,
      }}>
      <p style={{fontSize:`${fontSize-2}px`, color}} className="font-bold mb-0.5">
        {TYPE_ICON[bubble.type]}&nbsp;{isNpc ? '적' : '아군'}
      </p>
      <p style={{fontSize:`${fontSize}px`}} className="text-white font-medium leading-snug">
        "{bubble.text}"
      </p>
    </div>
  );
}

// ── NPC + Player 말풍선을 세로로 배치 ─────────────────────
function DualBubble({ bubbles, zoom }: { bubbles: SpeechBubble[]; zoom: ZoomLevel }) {
  // 가장 최근 NPC / Player 말풍선 각각
  const npcBubble    = [...bubbles].reverse().find(b => b.side === 'npc')    ?? null;
  const playerBubble = [...bubbles].reverse().find(b => b.side === 'player') ?? null;

  if (!npcBubble && !playerBubble) return null;

  return (
    <div className="absolute inset-x-2 z-20 pointer-events-none flex flex-col gap-1"
      style={{top:'50%', transform:'translateY(-50%)'}}>
      {/* NPC 말풍선 (위) */}
      {npcBubble && (
        <SpeechBubbleBox bubble={npcBubble} zoom={zoom} position="top"/>
      )}
      {/* Player 말풍선 (아래) */}
      {playerBubble && (
        <SpeechBubbleBox bubble={playerBubble} zoom={zoom} position="bottom"/>
      )}
    </div>
  );
}

type SquadView = 1 | 2;
const ROWS = 3, COLS = 4;

export default function BattleField({
  playerUnits, npcUnits, zoom, turn, isBusy,
  selectedUid, onSelectUnit, onOpenModal,
  onPlaceUnit, onAttack, bubbles=[],
}: Props) {
  const [squadView, setSquadView] = useState<SquadView>(1);
  const [dragOver,  setDragOver]  = useState<string|null>(null);
  const [dragUid,   setDragUid]   = useState<string|null>(null);

  const isWide = zoom === 50; // 50%: 전체 보기

  const buildGrid = (units: BattleUnit[], squad: SquadView) => {
    const grid: (BattleUnit|null)[][] = Array.from({length:ROWS},()=>Array(COLS).fill(null));
    units.filter(u=>u.squad===squad).forEach(u=>{
      if(u.row<ROWS && u.col<COLS) grid[u.row][u.col]=u;
    });
    return grid;
  };

  const handleDragStart = (uid: string) => setDragUid(uid);

  const handleDropSlot = (squad: 1|2, row: number, col: number) => {
    if(dragUid){ onPlaceUnit(dragUid,squad,row,col); setDragUid(null); setDragOver(null); }
  };
  const handleDropEnemy = (defUid: string) => {
    if(dragUid){ onAttack(dragUid,defUid); setDragUid(null); setDragOver(null); }
  };

  const selectedUnit = [...playerUnits,...npcUnits].find(u=>u.uid===selectedUid);

  const renderGrid = (
    grid:(BattleUnit|null)[][],
    side:'player'|'npc',
    squad:SquadView,
    reverseRows=false  // NPC: true (3열 위, 1열 아래)
  ) => {
    const ROW_LABEL: Record<number,string> = {
      0: '1열 ⚔️', 1: '2열 🏹', 2: '3열 🪄'
    };
    const rows = reverseRows ? [...grid].reverse() : grid;
    

    return(
      <div className="overflow-x-auto" style={{scrollbarWidth:'none'}}>
        <div className="space-y-1" style={{minWidth:'max-content'}}>
          {rows.map((row, displayIdx)=>{
          const ri = reverseRows ? (ROWS-1-displayIdx) : displayIdx;
          return(
            <div key={ri} className="flex gap-1 justify-start items-center pl-1">
              {/* 행 라벨 (200%+ 일때만) */}
              {zoom >= 200 && (
                <span className="text-[7px] text-gray-700 w-8 text-right flex-shrink-0">
                  {ROW_LABEL[ri]}
                </span>
              )}
              {row.map((unit,ci)=>{
                const slotKey=`${side}${squad}r${ri}c${ci}`;
                const isEnemy=side==='npc';
                const canDrag=!isEnemy && turn==='player' && !isBusy;
                const isDropEnemy=isEnemy && turn==='player' && !isBusy && dragUid!==null
                  && playerUnits.some(u=>u.uid===dragUid);

                if(unit && !unit.isDead) return(
                  <div key={ci} style={{position:'relative'}}>
                    <BattleCard unit={unit} zoom={zoom} isEnemy={isEnemy}
                      isSelected={selectedUid===unit.uid}
                      isDragging={dragUid===unit.uid}
                      canDrag={canDrag}
                      onDragStart={()=>handleDragStart(unit.uid)}
                      onDragOver={()=>isDropEnemy&&setDragOver(`e-${unit.uid}`)}
                      onDrop={()=>isDropEnemy&&handleDropEnemy(unit.uid)}
                      onSelect={()=>{
                        if(isEnemy && selectedUnit && turn==='player' && !isBusy)
                          onAttack(selectedUnit.uid,unit.uid);
                        else onSelectUnit(selectedUid===unit.uid?null:unit.uid);
                      }}
                      onOpenModal={()=>onOpenModal(unit)}/>
                    {dragOver===`e-${unit.uid}`&&(
                      <div className="absolute inset-0 rounded-lg border-2 border-red-400 bg-red-400/15 z-20 pointer-events-none"/>
                    )}
                  </div>
                );
                if(unit?.isDead) return <BattleCard key={ci} unit={unit} zoom={zoom}/>;
                return(
                  <EmptySlot key={ci} zoom={zoom} isEnemy={isEnemy}
                    isDragOver={dragOver===slotKey && !isEnemy}
                    onDragOver={!isEnemy&&turn==='player'&&!isBusy?e=>{e.preventDefault();setDragOver(slotKey);}:undefined}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={!isEnemy&&turn==='player'&&!isBusy?e=>{
                      e.preventDefault();
                      const reserveUid=e.dataTransfer.getData('reserveUid');
                      if(reserveUid){ onPlaceUnit(reserveUid,squad as 1|2,ri,ci); setDragOver(null); return; }
                      handleDropSlot(squad as 1|2,ri,ci);
                    }:undefined}/>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  const aliveP1=playerUnits.filter(u=>!u.isDead&&u.squad===1).length;
  const aliveP2=playerUnits.filter(u=>!u.isDead&&u.squad===2).length;
  const aliveN1=npcUnits.filter(u=>!u.isDead&&u.squad===1).length;
  const aliveN2=npcUnits.filter(u=>!u.isDead&&u.squad===2).length;

  // ── 50%: 1군+2군 중앙 집중 표시 ──────────────────────────
  if(isWide) return(
    <div className="flex flex-col h-full overflow-auto">

      {/* NPC 전체 — 1군+2군 중앙 밀착 */}
      <div className="flex-shrink-0 pt-1">
        <p className="text-[7px] text-red-400/30 text-center uppercase tracking-[0.3em] mb-0.5">NPC</p>
        <div className="flex justify-center items-start gap-0.5">
          {/* NPC 1군 — 오른쪽 정렬, 행 역순 (2,1,0 → 3열 위, 1열 아래) */}
          <div>
            {[2,1,0].map(ri=>(
              <div key={ri} className="flex gap-0.5 mb-0.5 justify-end">
                {buildGrid(npcUnits,1)[ri].map((unit,ci)=>
                  unit&&!unit.isDead
                    ?<BattleCard key={ci} unit={unit} zoom={zoom} isEnemy
                        onSelect={()=>{ if(selectedUnit&&turn==='player'&&!isBusy) onAttack(selectedUnit.uid,unit.uid); }}
                        onOpenModal={()=>onOpenModal(unit)}/>
                    :unit?.isDead
                      ?<BattleCard key={ci} unit={unit} zoom={zoom}/>
                      :<EmptySlot key={ci} zoom={zoom} isEnemy/>
                )}
              </div>
            ))}
          </div>
          {/* 중앙 구분선 */}
          <div className="w-px self-stretch bg-amber-400/15 mx-0.5 flex-shrink-0"/>
          {/* NPC 2군 — 왼쪽 정렬, 행 역순 */}
          <div>
            {[2,1,0].map(ri=>(
              <div key={ri} className="flex gap-0.5 mb-0.5 justify-start">
                {buildGrid(npcUnits,2)[ri].map((unit,ci)=>
                  unit&&!unit.isDead
                    ?<BattleCard key={ci} unit={unit} zoom={zoom} isEnemy
                        onSelect={()=>{ if(selectedUnit&&turn==='player'&&!isBusy) onAttack(selectedUnit.uid,unit.uid); }}
                        onOpenModal={()=>onOpenModal(unit)}/>
                    :unit?.isDead
                      ?<BattleCard key={ci} unit={unit} zoom={zoom}/>
                      :<EmptySlot key={ci} zoom={zoom} isEnemy/>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NPC 말풍선 (배틀라인 위) */}
      {bubbles.some(b=>b.side==='npc') && (
        <div className="flex-shrink-0 px-3 pb-1">
          <SpeechBubbleBox
            bubble={[...bubbles].reverse().find(b=>b.side==='npc') ?? null}
            zoom={zoom} position="top"/>
        </div>
      )}

      {/* 배틀라인 */}
      <div className="relative flex items-center my-1 px-4 flex-shrink-0">
        <div className="flex-1 h-px bg-gradient-to-l from-amber-400/40 to-transparent"/>
        <span className="text-[6px] text-amber-400/30 mx-2 uppercase tracking-widest">Battle Line</span>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-400/40 to-transparent"/>
      </div>

      {/* Player 말풍선 (배틀라인 아래) */}
      {bubbles.some(b=>b.side==='player') && (
        <div className="flex-shrink-0 px-3 pt-1">
          <SpeechBubbleBox
            bubble={[...bubbles].reverse().find(b=>b.side==='player') ?? null}
            zoom={zoom} position="bottom"/>
        </div>
      )}

      {/* 플레이어 전체 — 1군+2군 중앙 밀착 */}
      <div className="flex-shrink-0">
        <div className="flex justify-center items-start gap-0.5">
          {/* 플레이어 1군 */}
          <div>
            {[0,1,2].map(ri=>(
              <div key={ri} className="flex gap-0.5 mb-0.5 justify-end">
                {buildGrid(playerUnits,1)[ri].map((unit,ci)=>{
                  const sk=`p1r${ri}c${ci}`;
                  return unit&&!unit.isDead
                    ?<BattleCard key={ci} unit={unit} zoom={zoom}
                        isSelected={selectedUid===unit.uid}
                        canDrag={turn==='player'&&!isBusy}
                        onDragStart={()=>setDragUid(unit.uid)}
                        onSelect={()=>onSelectUnit(selectedUid===unit.uid?null:unit.uid)}
                        onOpenModal={()=>onOpenModal(unit)}/>
                    :unit?.isDead
                      ?<BattleCard key={ci} unit={unit} zoom={zoom}/>
                      :<EmptySlot key={ci} zoom={zoom}
                          isDragOver={dragOver===sk}
                          onDragOver={dragUid?e=>{e.preventDefault();setDragOver(sk);}:undefined}
                          onDragLeave={()=>setDragOver(null)}
                          onDrop={dragUid?e=>{e.preventDefault();handleDropSlot(1,ri,ci);}:undefined}/>
                })}
              </div>
            ))}
          </div>
          {/* 중앙 구분선 */}
          <div className="w-px self-stretch bg-amber-400/15 mx-0.5 flex-shrink-0"/>
          {/* 플레이어 2군 */}
          <div>
            {[0,1,2].map(ri=>(
              <div key={ri} className="flex gap-0.5 mb-0.5 justify-start">
                {buildGrid(playerUnits,2)[ri].map((unit,ci)=>{
                  const sk=`p2r${ri}c${ci}`;
                  return unit&&!unit.isDead
                    ?<BattleCard key={ci} unit={unit} zoom={zoom}
                        isSelected={selectedUid===unit.uid}
                        canDrag={turn==='player'&&!isBusy}
                        onDragStart={()=>setDragUid(unit.uid)}
                        onSelect={()=>onSelectUnit(selectedUid===unit.uid?null:unit.uid)}
                        onOpenModal={()=>onOpenModal(unit)}/>
                    :unit?.isDead
                      ?<BattleCard key={ci} unit={unit} zoom={zoom}/>
                      :<EmptySlot key={ci} zoom={zoom}
                          isDragOver={dragOver===sk}
                          onDragOver={dragUid?e=>{e.preventDefault();setDragOver(sk);}:undefined}
                          onDragLeave={()=>setDragOver(null)}
                          onDrop={dragUid?e=>{e.preventDefault();handleDropSlot(2,ri,ci);}:undefined}/>
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[7px] text-blue-400/30 text-center uppercase tracking-[0.3em] mt-0.5 mb-1">플레이어</p>
      </div>

      {/* 하단 생존 현황 */}
      <div className="flex justify-center gap-4 py-1 border-t border-white/05 bg-black/40 flex-shrink-0">
        <span className="text-[8px] text-red-400/50">NPC 1군:{aliveN1} 2군:{aliveN2}</span>
        <span className="text-[8px] text-blue-400/50">PL 1군:{aliveP1} 2군:{aliveP2}</span>
      </div>
    </div>
  );

  // ── 200%+: 단일군 + 좌우 화살표 ──────────────────────────
  return(
    <div className="flex flex-col h-full">

      {/* 군단 전환 화살표 헤더 */}
      <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0
        border-b border-amber-400/10 bg-black/40">

        {/* 이전 군단 */}
        <button onClick={()=>setSquadView(s=>s===2?1:2)}
          className={`flex items-center gap-1 text-[11px] transition px-2 py-1 rounded-lg ${
            squadView===2
              ?'text-amber-300 border border-amber-400/30 bg-amber-400/05'
              :'text-gray-600 hover:text-gray-400'
          }`}>
          <span className="text-base">←</span>
          {squadView===2 && <span className="text-[9px]" style={{fontFamily:'Cinzel,serif'}}>1군</span>}
        </button>

        {/* 현재 군단 정보 */}
        <div className="text-center">
          <p className="text-[10px] font-bold text-amber-300"
            style={{fontFamily:'Cinzel,serif'}}>{squadView}군</p>
          <p className="text-[8px] text-gray-600">
            🔴{squadView===1?aliveN1:aliveN2} vs 🟢{squadView===1?aliveP1:aliveP2}
          </p>
        </div>

        {/* 다음 군단 */}
        <button onClick={()=>setSquadView(s=>s===1?2:1)}
          className={`flex items-center gap-1 text-[11px] transition px-2 py-1 rounded-lg ${
            squadView===1
              ?'text-amber-300 border border-amber-400/30 bg-amber-400/05'
              :'text-gray-600 hover:text-gray-400'
          }`}>
          {squadView===1 && <span className="text-[9px]" style={{fontFamily:'Cinzel,serif'}}>2군</span>}
          <span className="text-base">→</span>
        </button>
      </div>

      {/* 전장 */}
      <div className="flex-1 flex flex-col justify-between overflow-auto p-2">
        {/* NPC */}
        <div>
          <p className="text-[7px] text-red-400/30 text-center uppercase tracking-[0.3em] mb-1.5">
            NPC {squadView}군
          </p>
          {renderGrid(buildGrid(npcUnits,squadView),'npc',squadView, true)}
        </div>

        {/* 배틀라인 */}
        <div className="relative flex items-center gap-2 my-2 flex-shrink-0">
          <div className="flex-1 h-px bg-gradient-to-l from-amber-400/40 to-transparent"/>
          <span className="text-[7px] text-amber-400/30 uppercase tracking-widest flex-shrink-0"
            style={{fontFamily:'Cinzel,serif'}}>Battle Line</span>
          <div className="flex-1 h-px bg-gradient-to-r from-amber-400/40 to-transparent"/>
          {/* 말풍선 (200/400%용) */}
          <DualBubble bubbles={bubbles} zoom={zoom}/>
        </div>

        {/* 플레이어 */}
        <div>
          {renderGrid(buildGrid(playerUnits,squadView),'player',squadView)}
          <p className="text-[7px] text-blue-400/30 text-center uppercase tracking-[0.3em] mt-1.5">
            플레이어 {squadView}군
          </p>
        </div>
      </div>

      {/* 스와이프 힌트 도트 */}
      <div className="flex justify-center gap-1.5 py-1 flex-shrink-0">
        {([1,2] as SquadView[]).map(sq=>(
          <button key={sq} onClick={()=>setSquadView(sq)}
            className={`rounded-full transition-all duration-300 ${
              squadView===sq?'w-4 h-1.5 bg-amber-400':'w-1.5 h-1.5 bg-gray-700'
            }`}/>
        ))}
      </div>
    </div>
  );
}