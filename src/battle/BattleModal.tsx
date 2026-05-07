/**
 * BattleModal.tsx v2
 * - 5:7 세로 직사각형
 * - 등급별 고급 액자 테두리
 * - 스킬/마법/대사 전체 표시
 */
// BattleModal
import type { BattleUnit } from './BattleEngine';

const EI:Record<string,string>={fire:'🔥',water:'💧',wind:'🌬️',light:'✨',dark:'🌑',earth:'🪨'};
const AI:Record<string,string>={melee:'⚔️ 근접',ranged:'🏹 원거리',magic:'🪄 마법'};
const hpC=(p:number)=>p>0.6?'#22c55e':p>0.3?'#eab308':'#ef4444';

// 등급별 고급 액자
const RARITY_FRAME:Record<string,{
  outer:string; inner:string; glow:string; corner:string; label:string;
}> = {
  normal: {
    outer:'border-gray-500/60 bg-gradient-to-b from-gray-800 to-gray-900',
    inner:'border-gray-600/40', glow:'', corner:'text-gray-500', label:'NORMAL',
  },
  bronze: {
    outer:'border-amber-700/80 bg-gradient-to-b from-amber-900 to-stone-900',
    inner:'border-amber-600/50',
    glow:'shadow-[0_0_20px_rgba(180,83,9,0.4)]',
    corner:'text-amber-600', label:'BRONZE',
  },
  silver: {
    outer:'border-slate-300/80 bg-gradient-to-b from-slate-700 to-slate-900',
    inner:'border-slate-400/50',
    glow:'shadow-[0_0_25px_rgba(148,163,184,0.5)]',
    corner:'text-slate-300', label:'SILVER',
  },
  gold: {
    outer:'border-yellow-400/90 bg-gradient-to-b from-yellow-900 to-stone-900',
    inner:'border-yellow-400/60',
    glow:'shadow-[0_0_30px_rgba(250,204,21,0.6),0_0_60px_rgba(250,204,21,0.2)]',
    corner:'text-yellow-400', label:'GOLD ✦',
  },
  legendary: {
    outer:'border-purple-400/90 bg-gradient-to-b from-purple-900 to-indigo-950',
    inner:'border-purple-400/60',
    glow:'shadow-[0_0_40px_rgba(168,85,247,0.7),0_0_80px_rgba(168,85,247,0.3)]',
    corner:'text-purple-300', label:'✦ LEGEND ✦',
  },
};

interface Props { unit: BattleUnit; onClose: () => void; }

export default function BattleModal({ unit, onClose }: Props) {
  const { card } = unit;
  const hp = unit.currentHp / card.health;
  const rarity = card.rarity?.toLowerCase() ?? 'normal';
  const frame = RARITY_FRAME[rarity] ?? RARITY_FRAME.normal;
  const abils = (card as any).equippedAbilities ?? [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm"/>

      {/* 외부 액자 — 5:7 비율 */}
      <div
        className={`relative z-10 border-4 rounded-2xl p-1.5 ${frame.outer} ${frame.glow}
          animate-in zoom-in-95 duration-200`}
        style={{width:'240px', height:'336px'}}
        onClick={e=>e.stopPropagation()}>

        {/* 모서리 장식 */}
        {['top-1 left-1','top-1 right-1','bottom-1 left-1','bottom-1 right-1'].map(pos=>(
          <div key={pos} className={`absolute ${pos} text-[10px] ${frame.corner} leading-none`}>◆</div>
        ))}

        {/* 등급 라벨 */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
          px-3 py-0.5 rounded-full border text-[8px] font-bold tracking-widest
          ${frame.inner} bg-black/90 ${frame.corner}`}>
          {frame.label}
        </div>

        {/* 내부 액자 */}
        <div className={`w-full h-full rounded-xl border-2 overflow-hidden flex flex-col ${frame.inner}`}>

          {/* 이미지 영역 — 60% */}
          <div className="relative flex-shrink-0" style={{height:'55%'}}>
            {card.imageUrl
              ?<img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover"/>
              :<div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-900
                  flex items-center justify-center text-5xl">
                {EI[card.element]||'⚔️'}
              </div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
            {/* 이름 */}
            <div className="absolute bottom-1.5 left-2 right-2">
              <p className="text-white font-bold text-sm leading-tight truncate"
                style={{fontFamily:'Cinzel,serif'}}>{card.name}</p>
              <p className="text-[9px] mt-0.5" style={{color:frame.corner.replace('text-','').includes('/')
                ?'#fbbf24':frame.corner==='text-gray-500'?'#9ca3af':'#fbbf24'}}>
                {EI[card.element]} {card.element} · {AI[card.attackType]||card.attackType}
              </p>
            </div>
            {/* 닫기 */}
            <button onClick={onClose}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full
                flex items-center justify-center text-white text-xs hover:bg-black/90">✕</button>
          </div>

          {/* 정보 영역 — 40% 스크롤 */}
          <div className="flex-1 overflow-y-auto bg-[#0a0814] p-2 space-y-2"
            style={{scrollbarWidth:'none'}}>

            {/* HP 바 */}
            <div>
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-gray-600">HP</span>
                <span style={{color:hpC(hp)}}>{unit.currentHp}/{card.health}</span>
              </div>
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{width:`${hp*100}%`,backgroundColor:hpC(hp)}}/>
              </div>
            </div>

            {/* 스탯 */}
            <div className="grid grid-cols-2 gap-1">
              {[['⚔️','공격',card.attack,'#f87171'],
                ['🛡️','방어',card.defense,'#60a5fa']].map(([icon,label,val,color])=>(
                <div key={label as string} className="rounded-lg bg-black/40 px-2 py-1 text-center">
                  <p className="text-[8px] text-gray-600">{icon as string} {label as string}</p>
                  <p className="text-xs font-bold" style={{color:color as string}}>{val as number}</p>
                </div>
              ))}
            </div>

            {/* 카드 스토리 */}
            {(card as any).description && (
              <div className="rounded-lg bg-black/30 border border-amber-200/10 px-2 py-1.5">
                <p className="text-[8px] text-amber-200/50 mb-0.5">📖 스토리</p>
                <p className="text-[9px] text-stone-300 italic">"{(card as any).description}"</p>
              </div>
            )}

            {/* 스킬/마법 */}
            {abils.length > 0 && (
              <div className="space-y-1">
                {abils.map((a:any)=>(
                  <div key={a.id} className="rounded-lg px-2 py-1.5 bg-amber-500/08
                    border border-amber-500/20">
                    <p className="text-[9px] font-bold text-amber-200">
                      {a.abilityType==='skill'?'⚡':'🪄'} {a.name}
                    </p>
                    <p className="text-[8px] text-gray-400 mt-0.5">{a.description}</p>
                    <p className="text-[8px] text-amber-400/50 mt-0.5">
                      {a.abilityType==='skill'
                        ?`발동 ${a.triggerChance}% · 쿨 ${a.cooldown}턴`
                        :`MP ${a.mpCost}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 대사 */}
            {card.battleDialogue && (
              <div className="rounded-lg bg-black/30 border border-amber-200/10 px-2 py-1.5">
                <p className="text-[8px] text-amber-200/60 italic">"{card.battleDialogue}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
