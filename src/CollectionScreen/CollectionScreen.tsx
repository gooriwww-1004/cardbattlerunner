/**
 * CollectionScreen.tsx
 * 뽑기 탭 → 컬렉션 + 주인공 설정 화면
 * - 주인공 이름/이미지 설정
 * - 컬렉션 카드 그리드
 * - 전투 덱 체크 (최대 12)
 * - 카드 조합
 * - 별 → 가차
 */
import { useState } from 'react';
import TopBar from '../TopBar';
import type { CollectionCard, CollectionData } from './useCollection';
import { GACHA_COST } from './useCollection';

const EI: Record<string,string> = {fire:'🔥',water:'💧',wind:'🌬️',light:'✨',dark:'🌑',earth:'🪨'};
const RARITY_COLOR: Record<string,string> = {
  normal:'border-gray-600', bronze:'border-amber-600',
  silver:'border-slate-300', gold:'border-yellow-400',
};
const LEVEL_LABEL = ['','Lv.1','Lv.2','Lv.3','Lv.4','Lv.5 MAX'];

type Tab = 'collection' | 'deck' | 'combine' | 'gacha';

interface Props {
  data: CollectionData;
  stars: number;
  onBack: () => void;
  onSetHeroName: (name:string) => void;
  onSetHeroCard: (uid:string) => void;   // 드래그앤드롭으로 주인공 카드 설정
  onToggleDeck: (uid:string) => void;
  onCombine: (uid1:string, uid2:string) => void;
  onGacha: (rarity:'normal'|'bronze'|'silver'|'gold') => void;
  onUpgradeStat: (stat:'attack'|'defense'|'health') => void; // 스탯 직접 업그레이드
}

// ── 카드 썸네일 ───────────────────────────────────────────
function CardThumb({
  card, isActive, isSelected,
  onClick, size=48, draggable=false
}: {
  card: CollectionCard;
  isActive?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: number;
  draggable?: boolean;
}) {
  return (
    <button onClick={onClick}
      draggable={draggable}
      onDragStart={e=>{
        if(draggable) e.dataTransfer.setData('cardUid', card.uid);
      }}
      className={`relative rounded-xl overflow-hidden border-2 flex-shrink-0
        transition active:scale-95 ${RARITY_COLOR[card.rarity]||'border-gray-600'}
        ${isActive ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-transparent' : ''}
        ${isSelected ? 'ring-2 ring-blue-400/80' : ''}
      `}
      style={{width:`${size}px`, height:`${Math.floor(size*4/3)}px`}}>
      {card.imageUrl
        ?<img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover"/>
        :<div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-900
            flex items-center justify-center"
          style={{fontSize:`${size*0.35}px`}}>{EI[card.element]||'⚔️'}</div>
      }
      {/* 레벨 뱃지 */}
      {card.level > 1 && (
        <div className="absolute top-0.5 right-0.5 bg-amber-500 text-black
          rounded text-[7px] font-bold px-0.5">
          {card.level}
        </div>
      )}
      {/* 덱 체크 */}
      {isActive && (
        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-amber-400
          rounded-full flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">✓</span>
        </div>
      )}
      {/* 선택됨 (조합용) */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-400/20 flex items-center justify-center">
          <span className="text-white text-lg">✓</span>
        </div>
      )}
    </button>
  );
}

// ── 카드 상세 모달 ────────────────────────────────────────
function CardDetail({card, onClose}:{card:CollectionCard;onClose:()=>void}) {
  return(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/80"/>
      <div className="relative z-10 w-full max-w-[260px] rounded-2xl overflow-hidden
        border-2 border-amber-400/40 bg-[#0d0b1a]"
        onClick={e=>e.stopPropagation()}>
        {/* 이미지 */}
        <div className="relative" style={{height:'200px'}}>
          {card.imageUrl
            ?<img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover"/>
            :<div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-900
                flex items-center justify-center text-6xl">{EI[card.element]||'⚔️'}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
          <div className="absolute bottom-2 left-3">
            <p className="text-white font-bold" style={{fontFamily:'Cinzel,serif'}}>{card.name}</p>
            <p className="text-amber-400/70 text-[10px]">{LEVEL_LABEL[card.level]} · {card.rarity}</p>
          </div>
          <button onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full
              text-white text-sm flex items-center justify-center">✕</button>
        </div>
        {/* 스탯 */}
        <div className="p-3 grid grid-cols-3 gap-2">
          {[['⚔️','공격',card.attack,'#f87171'],
            ['🛡️','방어',card.defense,'#60a5fa'],
            ['❤️','체력',card.health,'#22c55e']].map(([icon,label,val,color])=>(
            <div key={label as string} className="text-center rounded-lg bg-black/30 py-1.5">
              <p className="text-[9px] text-gray-600">{icon as string}</p>
              <p className="text-xs font-bold" style={{color:color as string}}>{val as number}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function CollectionScreen({
  data, stars, onBack,
  onSetHeroName, onSetHeroCard,
  onToggleDeck, onCombine, onGacha, onUpgradeStat,
}: Props) {
  const [tab,          setTab]      = useState<Tab>('collection');
  const [detail,       setDetail]   = useState<CollectionCard|null>(null);
  const [selected,     setSelected] = useState<string[]>([]);
  const [editName,     setEditName] = useState(false);
  const [nameVal,      setNameVal]  = useState(data.heroName);
  const [pulling,      setPulling]  = useState(false);
  const [dragOverHero, setDragOverHero] = useState(false);

  // 주인공 카드 (activeDeck 첫 번째)
  const heroCard = data.activeDeck.length > 0
    ? data.cards.find(c=>c.uid===data.activeDeck[0]) ?? null
    : null;

  const activeDeck = data.activeDeck;

  // 조합 선택 토글
  const toggleSelect = (uid:string) => {
    setSelected(p => p.includes(uid)
      ? p.filter(x=>x!==uid)
      : p.length < 2 ? [...p, uid] : p
    );
  };

  // 가차 실행
  const handleGacha = (rarity: 'normal'|'bronze'|'silver'|'gold') => {
    if (stars < GACHA_COST[rarity]) return;
    setPulling(true);
    setTimeout(()=>{
      onGacha(rarity);
      // 새로 추가된 카드 (마지막 카드)
      setPulling(false);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060410]">
      <TopBar title="✨ 컬렉션" onBack={onBack}
        right={<span className="text-[10px] text-amber-400">⭐ {stars}</span>}/>

      {/* 주인공 프로필 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-400/15 bg-black/40">
        {/* 프로필 — 컬렉션 카드 드래그앤드롭 */}
        <div
          className={`w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0
            transition cursor-pointer ${
              dragOverHero
                ?'border-amber-400 bg-amber-400/20 scale-105'
                :'border-amber-400/50 bg-gradient-to-br from-amber-800 to-stone-900'
            }`}
          onDragOver={e=>{e.preventDefault();setDragOverHero(true);}}
          onDragLeave={()=>setDragOverHero(false)}
          onDrop={e=>{
            e.preventDefault(); setDragOverHero(false);
            const uid=e.dataTransfer.getData('cardUid');
            if(uid) onSetHeroCard(uid);
          }}>
          {heroCard?.imageUrl
            ?<img src={heroCard.imageUrl} alt={heroCard.name} className="w-full h-full object-cover"/>
            :<div className="w-full h-full flex items-center justify-center">
              {dragOverHero
                ?<span className="text-amber-400 text-xl">+</span>
                :<span className="text-2xl">👤</span>
              }
            </div>
          }
        </div>
        {/* 이름 + 스탯 */}
        <div className="flex-1 min-w-0">
          {editName ? (
            <input autoFocus value={nameVal}
              onChange={e=>setNameVal(e.target.value)}
              onBlur={()=>{ onSetHeroName(nameVal); setEditName(false); }}
              onKeyDown={e=>e.key==='Enter'&&(onSetHeroName(nameVal),setEditName(false))}
              className="text-sm font-bold text-amber-200 bg-transparent border-b
                border-amber-400/50 outline-none w-full"/>
          ):(
            <button onClick={()=>{setNameVal(data.heroName);setEditName(true);}}
              className="text-sm font-bold text-amber-200 flex items-center gap-1">
              {data.heroName} <span className="text-[9px] text-gray-600">✏️</span>
            </button>
          )}
          {/* 스탯 + 업그레이드 버튼 */}
          {heroCard && (
            <div className="flex gap-2 mt-1">
              {([
                ['⚔️',heroCard.attack,'attack','#f87171'],
                ['🛡️',heroCard.defense,'defense','#60a5fa'],
                ['❤️',heroCard.health,'health','#22c55e'],
              ] as [string,number,'attack'|'defense'|'health',string][]).map(([icon,val,stat,color])=>(
                <button key={stat} onClick={()=>onUpgradeStat(stat)}
                  className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5
                    border border-white/10 hover:border-amber-400/40 transition active:scale-95">
                  <span className="text-[9px]">{icon}</span>
                  <span className="text-[9px] font-bold" style={{color}}>{val}</span>
                  <span className="text-[8px] text-gray-700">+</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-[9px] text-gray-600 mt-0.5">
            {heroCard ? `카드 ${data.cards.length}장 · 덱 ${activeDeck.length}/12` : '👆 카드를 끌어다 놓으세요'}
          </p>
        </div>
        {/* 별 표시 */}
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">⭐</p>
          <p className="text-xs text-amber-300 font-bold">{stars}</p>
        </div>
      </div>

      {/* 탭 네비 */}
      <div className="flex border-b border-white/08">
        {([
          ['collection','📦 컬렉션'],
          ['deck','⚔️ 덱 설정'],
          ['combine','🔗 조합'],
          ['gacha','🎴 뽑기'],
        ] as [Tab,string][]).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2 text-[10px] font-bold transition ${
              tab===t ? 'text-amber-300 border-b-2 border-amber-400' : 'text-gray-600'
            }`}>{label}</button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="flex-1 overflow-y-auto">

        {/* ── 컬렉션 탭 ── */}
        {tab==='collection' && (
          <div className="p-3">
            {data.cards.length===0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">카드가 없어요</p>
                <p className="text-gray-700 text-[10px] mt-1">뽑기 탭에서 카드를 획득하세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {data.cards.map(card=>(
                  <CardThumb
                    key={card.uid} card={card} size={52}
                    draggable={true}
                    isActive={activeDeck.includes(card.uid)}
                    onClick={()=>setDetail(card)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 덱 설정 탭 ── */}
        {tab==='deck' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-amber-200/60 uppercase tracking-wider">
                전투 덱 설정
              </p>
              <span className={`text-[10px] font-bold ${
                activeDeck.length===12?'text-amber-400':'text-gray-500'
              }`}>{activeDeck.length}/12</span>
            </div>
            <p className="text-[9px] text-gray-600">
              카드를 탭해서 전투 덱에 추가/제거. 최대 12장.
            </p>
            {data.cards.length===0 ? (
              <p className="text-gray-700 text-xs text-center py-6">보유 카드 없음</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {data.cards.map(card=>(
                  <CardThumb
                    key={card.uid} card={card} size={52}
                    isActive={activeDeck.includes(card.uid)}
                    onClick={()=>onToggleDeck(card.uid)}
                  />
                ))}
              </div>
            )}
            {/* 덱 미리보기 */}
            {activeDeck.length>0&&(
              <div className="border-t border-white/08 pt-3">
                <p className="text-[9px] text-amber-200/60 mb-2">선택된 덱</p>
                <div className="flex gap-1.5 flex-wrap">
                  {activeDeck.map(uid=>{
                    const card=data.cards.find(c=>c.uid===uid);
                    if(!card) return null;
                    return<CardThumb key={uid} card={card} size={36} isActive/>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 조합 탭 ── */}
        {tab==='combine' && (
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-amber-200/60 uppercase tracking-wider">카드 조합</p>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/05 p-3">
              <p className="text-[10px] text-amber-300/70 mb-1">규칙</p>
              <p className="text-[9px] text-gray-500 leading-relaxed">
                같은 레벨의 카드 2장 선택 → 상위 레벨로 합성<br/>
                능력치 평균 + 1~2 보너스 · 최대 Lv.5
              </p>
            </div>

            {/* 선택된 카드 프리뷰 */}
            <div className="flex items-center gap-3 justify-center">
              {[0,1].map(i=>{
                const uid=selected[i];
                const card=uid?data.cards.find(c=>c.uid===uid):null;
                return(
                  <div key={i} className={`w-16 h-[85px] rounded-xl border-2 flex items-center justify-center ${
                    card?'border-blue-400/60':'border-dashed border-gray-700'
                  }`}>
                    {card
                      ?<CardThumb card={card} size={56} isSelected/>
                      :<span className="text-gray-700 text-2xl">?</span>
                    }
                  </div>
                );
              })}
              <div className="text-amber-400 text-xl">→</div>
              <div className="w-16 h-[85px] rounded-xl border-2 border-dashed border-amber-400/30
                flex flex-col items-center justify-center gap-1">
                <span className="text-amber-400/40 text-xl">⭐</span>
                <span className="text-[8px] text-amber-400/40">합성</span>
              </div>
            </div>

            {selected.length===2&&(()=>{
              const c1=data.cards.find(c=>c.uid===selected[0]);
              const c2=data.cards.find(c=>c.uid===selected[1]);
              const canCombine=c1&&c2&&c1.level===c2.level&&c1.level<5;
              return(
                <button
                  disabled={!canCombine}
                  onClick={()=>{if(canCombine){onCombine(selected[0],selected[1]);setSelected([]);}}}
                  className="w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-40
                    transition active:scale-95 bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-black">
                  {canCombine ? '✨ 합성!' : c1&&c2&&c1.level!==c2.level?'레벨이 달라요':'Lv.5 최대'}
                </button>
              );
            })()}

            <p className="text-[9px] text-gray-600 text-center">카드를 탭해서 선택</p>
            <div className="grid grid-cols-5 gap-2">
              {data.cards.map(card=>(
                <CardThumb
                  key={card.uid} card={card} size={52}
                  isSelected={selected.includes(card.uid)}
                  onClick={()=>toggleSelect(card.uid)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 뽑기 탭 ── */}
        {tab==='gacha' && (
          <div className="p-4 space-y-4">
            <div className="text-center">
              <p className="text-[10px] text-amber-200/60 uppercase tracking-wider mb-1">별 뽑기</p>
              <p className="text-2xl font-bold text-amber-400">⭐ {stars}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">배틀에서 별을 모아 카드를 뽑으세요</p>
            </div>

            {/* 뽑기 버튼 목록 */}
            {([
              ['normal',  '일반 뽑기',  3,  '#9ca3af', '⭐'],
              ['bronze',  '브론즈 뽑기',10, '#d97706', '🌟'],
              ['silver',  '실버 뽑기',  20, '#94a3b8', '💫'],
              ['gold',    '골드 뽑기',  50, '#fbbf24', '✨'],
            ] as [string,string,number,string,string][]).map(([rarity,label,cost,color,icon])=>(
              <button key={rarity}
                disabled={stars < cost || pulling}
                onClick={()=>handleGacha(rarity as any)}
                className="w-full rounded-xl py-3 px-4 flex items-center justify-between
                  border-2 transition active:scale-95 disabled:opacity-40"
                style={{borderColor:`${color}40`, background:`${color}10`}}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-bold" style={{color}}>{label}</p>
                    <p className="text-[9px] text-gray-500">{rarity} 등급 카드</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">⭐ {cost}</p>
                  <p className="text-[9px] text-gray-600">필요</p>
                </div>
              </button>
            ))}

            <div className="rounded-xl border border-white/05 p-3">
              <p className="text-[9px] text-gray-600 leading-relaxed">
                ⭐ 별 획득 방법<br/>
                • 턴마다 +1<br/>
                • 적 제거 +3<br/>
                • 5턴 달성 +2<br/>
                • 10턴 달성 +3
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 카드 상세 모달 */}
      {detail && <CardDetail card={detail} onClose={()=>setDetail(null)}/>}
    </div>
  );
}
