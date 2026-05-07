/**
 * useBattle.ts v2
 * 수정: 자동전투 (isAuto ON → 플레이어+NPC 모두 자동)
 * 수정: 수동모드 (플레이어 클릭, NPC 자동)
 * 수정: 스킬/마법 에디터 데이터 연동
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { CardDefinition } from '../types';
import type { BattleState, BattleUnit, SpeechBubble } from './BattleEngine';
import {
  initBattleState, calcDamage, tryTriggerSkill, getElemMul,
  applyDamage, applyHeal, applyStatus, tickStatuses,
  checkWinner, nextPhase, getAlive,
  canAttack, pickTarget,
} from './BattleEngine';

// ── 이펙트 (에디터 BattleTestTab 이식 — CSS 클래스 기반) ──
const SKILL_GLOW: Record<string,string> = {
  glow_gold:   "0 0 20px rgba(251,191,36,0.9)",
  glow_red:    "0 0 20px rgba(239,68,68,0.9)",
  glow_blue:   "0 0 20px rgba(59,130,246,0.9)",
  glow_green:  "0 0 20px rgba(34,197,94,0.9)",
  glow_purple: "0 0 20px rgba(168,85,247,0.9)",
  shield_anim: "0 0 20px rgba(59,130,246,0.9), 0 0 40px rgba(59,130,246,0.4)",
  particles:   "0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(168,85,247,0.4)",
};

// PNG 이펙트 오버레이 (CSS 애니메이션 위에 추가)
const EFFECT_PNG: Record<string,{src:string;size:number;color:string}> = {
  melee:  {src:"/assets/effects/hit_melee.png",  size:90,  color:"255,80,30"},
  ranged: {src:"/assets/effects/hit_ranged.png", size:70,  color:"251,191,36"},
  magic:  {src:"/assets/effects/magic_01.png",   size:110, color:"168,85,247"},
  heal:   {src:"/assets/effects/hit_heal.png",   size:80,  color:"34,197,94"},
  buff:   {src:"/assets/effects/hit_buff.png",   size:70,  color:"59,130,246"},
  debuff: {src:"/assets/effects/hit_debuff.png", size:70,  color:"139,92,246"},
};

function spawnPng(type:string, el:HTMLElement){
  const cfg = EFFECT_PNG[type] ?? EFFECT_PNG.melee;
  const img = new Image();
  img.onload = () => {
    const r  = el.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top  + r.height/2;
    const d  = document.createElement('div');
    d.style.cssText = `
      position:fixed;z-index:9999;pointer-events:none;
      left:${cx - cfg.size/2}px;top:${cy - cfg.size/2}px;
      width:${cfg.size}px;height:${cfg.size}px;
      background:url('${cfg.src}') center/contain no-repeat;
      mix-blend-mode:screen;
      filter:drop-shadow(0 0 10px rgba(${cfg.color},0.9))
             drop-shadow(0 0 20px rgba(${cfg.color},0.5));
      transform:scale(0.1);
      opacity:0;
      transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),opacity 0.12s;
    `;
    document.body.appendChild(d);
    // 1단계: 작게 → 크게 (스프링 팝)
    requestAnimationFrame(()=>{
      setTimeout(()=>{
        d.style.transform = 'scale(1.25)';
        d.style.opacity   = '1';
        // 2단계: 크게 → 작아지며 사라짐
        setTimeout(()=>{
          d.style.transition = 'transform 0.32s ease-in, opacity 0.28s ease-in';
          d.style.transform  = 'scale(0.3)';
          d.style.opacity    = '0';
          setTimeout(()=>d.remove(), 320);
        }, 170);
      }, 10);
    });
  };
  img.onerror = ()=>{};
  img.src = cfg.src;
}
const CSS_SFX: Record<string,string> = {
  glow_red:    '/assets/audio/btn_sound02.mp3', // 공격
  glow_blue:   '/assets/audio/btn_sound03.mp3', // 원거리
  glow_green:  '/assets/audio/btn_sound05.mp3', // 힐
  glow_purple: '/assets/audio/btn_sound04.mp3', // 마법
  glow_gold:   '/assets/audio/btn_sound05.mp3', // 버프
  flash_red:   '/assets/audio/btn_sound02.mp3',
  flash_white: '/assets/audio/btn_sound04.mp3',
  shield_anim: '/assets/audio/btn_sound03.mp3',
  particles:   '/assets/audio/btn_sound05.mp3',
};

const EFFECT_SFX: Record<string,string> = {
  damage:     '/assets/audio/btn_sound02.mp3',
  damage_pen: '/assets/audio/btn_sound02.mp3',
  damage_aoe: '/assets/audio/btn_sound04.mp3',
  buff_atk:   '/assets/audio/btn_sound05.mp3',
  buff_def:   '/assets/audio/btn_sound03.mp3',
  heal:       '/assets/audio/btn_sound05.mp3',
  heal_aoe:   '/assets/audio/btn_sound05.mp3',
  drain:      '/assets/audio/btn_sound04.mp3',
  debuff_atk: '/assets/audio/btn_sound03.mp3',
  debuff_def: '/assets/audio/btn_sound03.mp3',
  stun:       '/assets/audio/btn_sound04.mp3',
};

function applyClass(el:HTMLElement, cls:string, dur=400){
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), dur);
}

function screenFlash(color='rgba(239,68,68,0.15)', dur=250){
  const d=document.createElement('div');
  d.style.cssText=`position:fixed;inset:0;z-index:9990;
    background:${color};pointer-events:none;
    transition:opacity ${dur}ms;opacity:1;`;
  document.body.appendChild(d);
  requestAnimationFrame(()=>{
    setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),dur);},30);
  });
}

// 마법 글로우 빌드업 → 화면 암전 → 피격 플래시
function magicAttackFx(atkEl:HTMLElement|null, defEl:HTMLElement|null, cssEffect:string, onDone:()=>void){
  const glow = SKILL_GLOW[cssEffect] ?? SKILL_GLOW.glow_purple;
  if(atkEl){
    atkEl.style.transition='box-shadow 0.4s,filter 0.4s';
    atkEl.style.boxShadow=glow;
    atkEl.style.filter='brightness(1.4) saturate(1.3)';
  }
  setTimeout(()=>{
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.6);pointer-events:none;transition:opacity 0.3s';
    document.body.appendChild(overlay);
    setTimeout(()=>{
      if(defEl) applyClass(defEl,'magic-hit',400);
      screenFlash('rgba(255,255,255,0.25)',300);
      setTimeout(()=>{
        overlay.style.opacity='0';
        setTimeout(()=>overlay.remove(),300);
        if(atkEl){atkEl.style.boxShadow='';atkEl.style.filter='';}
        onDone();
      },450);
    },500);
  },300);
}

// 근접 이동 애니메이션
function meleeAttackFx(atkEl:HTMLElement|null, defEl:HTMLElement|null, isNpcAtk:boolean, onDone:()=>void){
  if(atkEl){
    const dir=isNpcAtk?'40px':'-40px';
    atkEl.style.transition='transform 0.2s ease-out';
    atkEl.style.transform=`translateY(${dir})`;
    setTimeout(()=>{
      atkEl.style.transform=`translateY(calc(${dir}*1.6))`;
      setTimeout(()=>{
        atkEl.style.transition='transform 0.25s ease-in';
        atkEl.style.transform='translateY(0)';
        if(defEl) applyClass(defEl,'melee-hit',300);
        screenFlash('rgba(239,68,68,0.12)',250);
        setTimeout(onDone,320);
      },180);
    },180);
  } else {
    if(defEl) applyClass(defEl,'melee-hit',300);
    onDone();
  }
}

// 원거리 투사체
function rangedAttackFx(atkEl:HTMLElement|null, defEl:HTMLElement|null, onDone:()=>void){
  if(atkEl&&defEl){
    const ar=atkEl.getBoundingClientRect(),dr=defEl.getBoundingClientRect();
    const proj=document.createElement('div');
    proj.style.cssText=`position:fixed;z-index:9999;pointer-events:none;
      width:10px;height:10px;border-radius:50%;
      background:radial-gradient(circle,#fbbf24,#f59e0b);
      box-shadow:0 0 6px rgba(251,191,36,0.8);
      left:${ar.left+ar.width/2-5}px;top:${ar.top+ar.height/2-5}px;
      transition:transform 0.22s linear,opacity 0.05s;`;
    document.body.appendChild(proj);
    const dx=dr.left+dr.width/2-(ar.left+ar.width/2);
    const dy=dr.top+dr.height/2-(ar.top+ar.height/2);
    requestAnimationFrame(()=>{
      setTimeout(()=>{
        proj.style.transform=`translate(${dx}px,${dy}px)`;
        proj.style.opacity='0.1';
      },20);
    });
    setTimeout(()=>{
      proj.remove();
      if(defEl) applyClass(defEl,'ranged-hit',350);
      setTimeout(onDone,350);
    },230);
  } else {
    if(defEl) applyClass(defEl,'ranged-hit',350);
    onDone();
  }
}

// 버프/힐 이펙트
function buffFx(el:HTMLElement|null, cssEffect:string){
  if(!el) return;
  const glow = SKILL_GLOW[cssEffect] ?? SKILL_GLOW.glow_green;
  el.style.transition='box-shadow 0.3s';
  el.style.boxShadow=glow;
  setTimeout(()=>{el.style.boxShadow='';},600);
}

function showDmgFloat(el:HTMLElement,text:string,color='255,68,68'){
  const r=el.getBoundingClientRect();
  const d=document.createElement('div');
  d.style.cssText=`position:fixed;z-index:9999;pointer-events:none;
    left:${r.left+r.width/2}px;top:${r.top+r.height*0.15}px;
    transform:translateX(-50%) scale(0.8);
    font-size:24px;font-weight:900;
    color:rgb(${color});text-shadow:0 0 8px rgba(0,0,0,1);
    opacity:1;transition:transform 1s ease-out,opacity 0.9s;white-space:nowrap;`;
  d.textContent=text;document.body.appendChild(d);
  requestAnimationFrame(()=>{
    d.style.transform='translateX(-50%) translateY(-65px) scale(1.3)';
    d.style.opacity='0';setTimeout(()=>d.remove(),1000);
  });
}

// ── 멀티 데미지 폰트 연출 ────────────────────────────────
function showMultiDmg(el:HTMLElement, dmg:number, type:'melee'|'ranged'|'magic'){
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width/2;
  const cy = r.top  + r.height*0.2;

  interface DmgStep {val:number; size:number; delay:number}
  let steps: DmgStep[] = [];

  if(type==='melee'){
    // 3단계: 절반 + 절반 + 전체(x8)
    const h = Math.ceil(dmg/2);
    steps = [
      {val:h,      size:18, delay:0},
      {val:dmg-h,  size:36, delay:100},
      {val:dmg,    size:72, delay:220},
    ];
  } else if(type==='ranged'){
    // 4단계 순차 증가
    const q = Math.ceil(dmg/4);
    const r2 = Math.ceil(dmg/3);
    const s3 = Math.ceil(dmg/2);
    steps = [
      {val:q,   size:16, delay:0},
      {val:r2,  size:24, delay:90},
      {val:s3,  size:32, delay:190},
      {val:dmg, size:48, delay:300},
    ];
  } else {
    // magic: 7개 +1씩 → 최종 전체(x4)
    const chunk = Math.max(1, Math.floor(dmg/7));
    for(let i=0;i<7;i++){
      steps.push({val:chunk, size:14, delay:i*60});
    }
    steps.push({val:dmg, size:56, delay:7*60+80});
  }

  steps.forEach(({val,size,delay})=>{
    setTimeout(()=>{
      const isFinal = size >= 48;
      const d = document.createElement('div');
      const spread = isFinal ? 0 : (Math.random()-0.5)*40;
      d.style.cssText = `position:fixed;z-index:9999;pointer-events:none;
        left:${cx + spread}px;top:${cy}px;
        transform:translateX(-50%) scale(0.6);
        font-size:${size}px;font-weight:900;letter-spacing:-1px;
        color:${isFinal?'rgb(255,50,50)':'rgb(255,160,50)'};
        text-shadow:0 0 ${isFinal?16:6}px rgba(0,0,0,1),0 0 ${isFinal?24:8}px rgba(255,80,0,0.8);
        opacity:1;transition:transform ${isFinal?0.6:0.45}s ease-out,opacity ${isFinal?0.7:0.4}s;
        white-space:nowrap;`;
      d.textContent = `-${val}`;
      document.body.appendChild(d);
      requestAnimationFrame(()=>{
        const rise = isFinal ? -90 : -45 - Math.random()*20;
        d.style.transform=`translateX(-50%) translateY(${rise}px) scale(${isFinal?1.4:1.0})`;
        d.style.opacity='0';
        setTimeout(()=>d.remove(), isFinal?700:450);
      });
    }, delay);
  });
}

function showSkillFlash(el:HTMLElement,name:string){
  const r=el.getBoundingClientRect();
  const d=document.createElement('div');
  d.style.cssText=`position:fixed;z-index:9999;pointer-events:none;
    left:${r.left+r.width/2}px;top:${r.top-5}px;transform:translateX(-50%);
    font-size:12px;font-weight:700;white-space:nowrap;color:#fbbf24;
    background:rgba(0,0,0,0.85);border:1px solid rgba(251,191,36,0.6);
    border-radius:5px;padding:3px 9px;opacity:1;
    transition:transform 1.3s ease-out,opacity 1.2s;`;
  d.textContent=`✨ ${name}`;document.body.appendChild(d);
  requestAnimationFrame(()=>{
    d.style.transform='translateX(-50%) translateY(-45px)';d.style.opacity='0';
    setTimeout(()=>d.remove(),1300);
  });
}

function playSfx(url:string,vol=0.6){
  if(!url) return;
  try{
    const a=new Audio(url);
    a.volume=Math.min(1,Math.max(0,vol));
    const p=a.play();
    if(p) p.catch(()=>{});
  }catch(e){ console.warn('playSfx 실패:',e); }
}

// effectType → 이펙트 타입 매핑
// ── 훅 ───────────────────────────────────────────────────
interface UseBattleProps {
  playerCards: CardDefinition[];
  npcCards: CardDefinition[];
  sfxOn?: boolean;
  speed?: 1 | 2;
}

export function useBattle({playerCards,npcCards,sfxOn=true,speed=2}:UseBattleProps){
  const [state,setState]=useState<BattleState>(()=>initBattleState(playerCards,npcCards));
  const [isAuto,setIsAuto]=useState(false);
  const isAutoRef=useRef(false);
  useEffect(()=>{ isAutoRef.current=isAuto; },[isAuto]);
  const [selectedUid,setSelectedUid]=useState<string|null>(null);

  // ── 예비 카드 (덱 후반부 → 대기창) ──────────────────────
  const [reservePlayer, setReservePlayer] = useState<BattleUnit[]>(()=>{
    const half = Math.ceil(playerCards.length / 2);
    return playerCards.slice(half).map((c,i)=>({
      card:c, uid:`rp${i}_${Date.now()}`,
      currentHp:c.health, isDead:false,
      side:'player' as const, squad:2 as const,
      row:0, col:i, statuses:[], skillCooldowns:{},
      equippedAbilities:(c as any).equippedAbilities??[],
    }));
  });
  const [reserveNpc, setReserveNpc] = useState<BattleUnit[]>(()=>{
    const half = Math.ceil(npcCards.length / 2);
    return npcCards.slice(half).map((c,i)=>({
      card:c, uid:`rn${i}_${Date.now()}`,
      currentHp:c.health, isDead:false,
      side:'npc' as const, squad:2 as const,
      row:0, col:i, statuses:[], skillCooldowns:{},
      equippedAbilities:(c as any).equippedAbilities??[],
    }));
  });

  // ── 별 게이지 ────────────────────────────────────────────
  const [starPlayer, setStarPlayer] = useState(0);
  const [starNpc,    _setStarNpc]   = useState(0);
  const busyRef=useRef(false);
  const stateRef=useRef(state);
  useEffect(()=>{stateRef.current=state;},[state]);

  const addLog=(msg:string)=>setState(s=>({...s,log:[...s.log.slice(-60),msg]}));

  // ── 말풍선 추가 ───────────────────────────────────────────
  const addBubbleRef = useRef((_uid:string, _text:string, _type:SpeechBubble['type'], _side:'player'|'npc')=>{});
  addBubbleRef.current = (uid:string, text:string, type:SpeechBubble['type'], side:'player'|'npc')=>{
    if(!text?.trim()) return;
    const bubble:SpeechBubble={uid,text,type,side,expires:Date.now()+3500};
    setState(s=>({...s,bubbles:[...s.bubbles.slice(-3),bubble]}));
    setTimeout(()=>{
      setState(s=>({...s,bubbles:s.bubbles.filter(b=>!(b.uid===uid&&b.expires===bubble.expires))}));
    },3500);
  };
  const addBubble=(uid:string,text:string,type:SpeechBubble['type'],side:'player'|'npc')=>
    addBubbleRef.current(uid,text,type,side);

  // ── 공격 실행 ───────────────────────────────────────────
  const doAttack=useCallback((atkUid:string,defUid:string,onDone:()=>void)=>{
    busyRef.current=true;
    const cur=stateRef.current;
    const allUnits=[...cur.playerUnits,...cur.npcUnits];
    const atk=allUnits.find(u=>u.uid===atkUid);
    const def=allUnits.find(u=>u.uid===defUid);
    if(!atk||!def||def.isDead){busyRef.current=false;onDone();return;}

    const isNpcAtk=atk.side==='npc';
    let dmg=calcDamage(atk,def);
    const mul=getElemMul(atk.card.element,def.card.element);
    const mulStr=mul>1?' 🔺':mul<1?' 🔻':'';

    // ── 스킬 발동 ─────────────────────────────────────────
    const sk=tryTriggerSkill(atk);
    if(sk){
      // 스킬 대사 말풍선
      const skDlg=(atk.card as any).skillDialogue;
      if(skDlg) addBubble(atk.uid, skDlg, 'skill', atk.side);

      const atkEl=document.getElementById(`bu-${atkUid}`);
      const defEl2=document.getElementById(`bu-${defUid}`);
      if(atkEl){
        showSkillFlash(atkEl, sk.name);
        buffFx(atkEl, sk.cssEffect??'glow_purple');
        // PNG 이펙트 (CSS 위에 추가)
        const pngType = sk.effectType==='heal'||sk.effectType==='heal_aoe' ? 'heal'
          : sk.effectType==='buff_atk'||sk.effectType==='buff_def' ? 'buff'
          : sk.effectType==='debuff_atk'||sk.effectType==='debuff_def' ? 'debuff'
          : sk.effectType==='damage_aoe' ? 'magic' : 'melee';
        spawnPng(pngType, atkEl);
        if(defEl2 && ['damage','damage_pen','damage_aoe','drain','stun'].includes(sk.effectType)){
          setTimeout(()=>{
            if(defEl2){ applyClass(defEl2,'magic-hit',400); spawnPng(pngType, defEl2); }
          },200);
        }
        if(['heal','heal_aoe','buff_atk','buff_def'].includes(sk.effectType)){
          buffFx(atkEl, sk.cssEffect??'glow_green');
        }
      }
      // 스킬 효과음: 카드 soundUrl > cssEffect 매핑 > effectType 매핑 > 기본
      const skillSfxUrl = sk.soundUrl
        ?? (atk.card as any).soundUrl
        ?? CSS_SFX[sk.cssEffect??'']
        ?? EFFECT_SFX[sk.effectType??'']
        ?? '/assets/audio/btn_sound05.mp3';
      if(sfxOn) playSfx(skillSfxUrl);

      setState(s=>{
        let pU=[...s.playerUnits],nU=[...s.npcUnits];
        switch(sk.effectType){
          // ── 에디터 effectType 별칭 포함 ──────────────────
          case 'damage': case 'damage_pen': case 'attack':
            dmg=Math.floor(dmg*(1+sk.power/100));
            addLog(`✨ ${atk.card.name}[${sk.name}] 데미지 +${sk.power}%`); break;
          case 'damage_aoe':
            dmg=Math.floor(dmg*(1+sk.power/100));
            addLog(`💥 ${atk.card.name}[${sk.name}] 광역!`); break;
          case 'buff_atk':
            if(isNpcAtk) nU=applyStatus(nU,atkUid,{type:'buff_atk',power:sk.power,turnsLeft:2});
            else         pU=applyStatus(pU,atkUid,{type:'buff_atk',power:sk.power,turnsLeft:2});
            addLog(`📈 ${atk.card.name}[${sk.name}] 공격력 +${sk.power}% 2턴`); break;
          case 'buff_def': case 'defense':
            if(isNpcAtk) nU=applyStatus(nU,atkUid,{type:'buff_def',power:sk.power,turnsLeft:2});
            else         pU=applyStatus(pU,atkUid,{type:'buff_def',power:sk.power,turnsLeft:2});
            addLog(`🛡️ ${atk.card.name}[${sk.name}] 방어력 +${sk.power}% 2턴`); break;
          case 'heal':{
            const amt=Math.floor(atk.card.health*sk.power/100);
            if(isNpcAtk) nU=applyHeal(nU,atkUid,amt);
            else         pU=applyHeal(pU,atkUid,amt);
            const el2=document.getElementById(`bu-${atkUid}`);
            if(el2) showDmgFloat(el2,`+${amt}`,'34,197,94');
            addLog(`💚 ${atk.card.name}[${sk.name}] HP +${amt}`); break;
          }
          case 'drain':{
            const damt=Math.floor(dmg*sk.power/100);
            if(isNpcAtk) nU=applyHeal(nU,atkUid,damt);
            else         pU=applyHeal(pU,atkUid,damt);
            addLog(`🩸 ${atk.card.name}[${sk.name}] 흡수 +${damt}`); break;
          }
          case 'debuff_atk':
            if(isNpcAtk) pU=applyStatus(pU,defUid,{type:'debuff_atk',power:sk.power,turnsLeft:1});
            else         nU=applyStatus(nU,defUid,{type:'debuff_atk',power:sk.power,turnsLeft:1});
            addLog(`📉 ${def.card.name} 공격력 -${sk.power}% 1턴`); break;
          case 'debuff_def':
            if(isNpcAtk) pU=applyStatus(pU,defUid,{type:'debuff_def',power:sk.power,turnsLeft:1});
            else         nU=applyStatus(nU,defUid,{type:'debuff_def',power:sk.power,turnsLeft:1});
            addLog(`📉 ${def.card.name} 방어력 -${sk.power}% 1턴`); break;
          case 'stun': case 'status':
            if(isNpcAtk) pU=applyStatus(pU,defUid,{type:'stun',power:0,turnsLeft:1});
            else         nU=applyStatus(nU,defUid,{type:'stun',power:0,turnsLeft:1});
            addLog(`⚡ ${def.card.name} 기절 1턴`); break;
          default:
            // 알 수 없는 타입 → 데미지 보너스로 처리
            dmg=Math.floor(dmg*1.2);
            addLog(`✨ ${atk.card.name}[${sk.name}]`); break;
        }
        // 쿨타임
        if(isNpcAtk) nU=nU.map(u=>u.uid===atkUid?{...u,skillCooldowns:{...u.skillCooldowns,[sk.id]:sk.cooldown??2}}:u);
        else         pU=pU.map(u=>u.uid===atkUid?{...u,skillCooldowns:{...u.skillCooldowns,[sk.id]:sk.cooldown??2}}:u);
        return{...s,playerUnits:pU,npcUnits:nU};
      });
    }

    const type=atk.card.attackType||'melee';
    const defEl=document.getElementById(`bu-${defUid}`);
    const atkEl=document.getElementById(`bu-${atkUid}`);

    const finish=()=>{
      let defIsDead = false;
      setState(s=>{
        let pU=[...s.playerUnits],nU=[...s.npcUnits];
        if(def.side==='npc'){
          nU=applyDamage(nU,defUid,dmg);
          const d=nU.find(u=>u.uid===defUid);
          if(d?.isDead) defIsDead=true;
        } else {
          pU=applyDamage(pU,defUid,dmg);
          const d=pU.find(u=>u.uid===defUid);
          if(d?.isDead) defIsDead=true;
        }
        pU=tickStatuses(pU);nU=tickStatuses(nU);
        const winner=checkWinner({...s,playerUnits:pU,npcUnits:nU});
        const phase=winner?'result':nextPhase({...s,playerUnits:pU,npcUnits:nU});
        return{...s,playerUnits:pU,npcUnits:nU,winner,phase};
      });

      if(defEl) showDmgFloat(defEl,`-${dmg}`);

      // 별 +3
      if(!def.isDead && def.side==='npc') {
        setTimeout(()=>{
          const cur=stateRef.current;
          const isNowDead=cur.npcUnits.find(u=>u.uid===defUid)?.isDead;
          if(isNowDead) setStarPlayer(s=>s+3);
        },100);
      }

      const icon=type==='melee'?'⚔️':type==='magic'?'🪄':'🏹';
      addLog(`${icon} ${atk.card.name}→${def.card.name}: ${dmg}dmg${mulStr}`);

      const btlDlg=(atk.card as any).battleDialogue;
      if(btlDlg && Math.random()<(isNpcAtk?0.20:0.60))
        addBubble(atk.uid, btlDlg, 'battle', atk.side);

      setTimeout(()=>{
        if(defIsDead){
          const deathDlg=(def.card as any).deathDialogue;
          if(deathDlg) addBubble(defUid, deathDlg, 'death', def.side);
        }
      },200);

      busyRef.current=false;
      onDone();
    };

    // ── 타입별 CSS 애니메이션 ────────────────────────────────
    const atkSfxUrl=(atk.card as any).soundUrl;
    if(sfxOn) playSfx(
      atkSfxUrl||(
        type==='melee'?'/assets/audio/btn_sound02.mp3':
        type==='ranged'?'/assets/audio/btn_sound03.mp3':
        '/assets/audio/btn_sound04.mp3'
      )
    );

    if(type==='melee'){
      meleeAttackFx(atkEl, defEl, isNpcAtk, ()=>{
        if(defEl){ spawnPng('melee',defEl); showMultiDmg(defEl,dmg,'melee'); }
        finish();
      });
    } else if(type==='magic'){
      const cssEff=sk?.cssEffect??(atk.card as any).equippedAbilities?.[0]?.cssEffect??'glow_purple';
      magicAttackFx(atkEl, defEl, cssEff, ()=>{
        if(defEl){ spawnPng('magic',defEl); showMultiDmg(defEl,dmg,'magic'); }
        finish();
      });
    } else {
      rangedAttackFx(atkEl, defEl, ()=>{
        if(defEl){ spawnPng('ranged',defEl); showMultiDmg(defEl,dmg,'ranged'); }
        finish();
      });
    }
  },[sfxOn]);

  // ── 플레이어 수동 공격 ───────────────────────────────────
  const playerAttack=useCallback((atkUid:string,defUid:string)=>{
    if(state.turn!=='player'||busyRef.current) return;
    const cur=stateRef.current;
    const atk=cur.playerUnits.find(u=>u.uid===atkUid);
    const def=cur.npcUnits.find(u=>u.uid===defUid);
    if(!atk||!def) return;
    const check=canAttack(atk,def,[...cur.playerUnits,...cur.npcUnits]);
    if(!check.allowed){
      addLog(`🛡️ ${check.reason} — 공격 불가`); return;
    }
    setSelectedUid(null);
    doAttack(atkUid,defUid,()=>{
      setState(s=>{if(s.winner) return s; return{...s,turn:'npc',turnNum:s.turnNum+1};});
    });
  },[state.turn,doAttack]);

  // ── NPC 전체 라운드 (살아있는 NPC 순서대로 전부 공격) ──
  const doNpcTurn=useCallback(()=>{
    if(busyRef.current||stateRef.current.phase==='result') return;
    const cur=stateRef.current;
    const nAlive=getAlive(cur.npcUnits);
    const pAlive=getAlive(cur.playerUnits);
    if(!nAlive.length||!pAlive.length) return;

    // 기절한 유닛 처리
    const stunned=nAlive.find(u=>u.statuses.some(s=>s.type==='stun'));
    if(stunned){
      addLog(`⚡ ${stunned.card.name} 기절`);
      setState(s=>({...s,
        npcUnits:tickStatuses(s.npcUnits),
        playerUnits:tickStatuses(s.playerUnits),
        turn:'player'
      }));
      return;
    }

    // 살아있는 NPC 전원 순서대로 공격
    let idx=0;
    const attackNext=()=>{
      // 정지 버튼 눌렀으면 중단
      if(!isAutoRef.current) { busyRef.current=false; return; }
      const cur2=stateRef.current;
      const nAlive2=getAlive(cur2.npcUnits);
      const pAlive2=getAlive(cur2.playerUnits);
      if(idx>=nAlive2.length||!pAlive2.length||cur2.winner){
        setState(s=>{if(s.winner) return s;
          return{...s,turn:'player',turnNum:s.turnNum+1};});
        return;
      }
      const atk=nAlive2[idx];
      const preferred=pickTarget(atk,pAlive2);
      if(!preferred){idx++;attackNext();return;}
      const check=canAttack(atk,preferred,[...cur2.playerUnits,...cur2.npcUnits]);
      const def=check.allowed?preferred:(pAlive2.find(u=>u.row===0)??preferred);
      idx++;
      doAttack(atk.uid,def.uid,()=>{
        setTimeout(attackNext,300);
      });
    };
    attackNext();
  },[doAttack]);

  // ── 플레이어 자동 라운드 ──────────────────────────────────
  const doPlayerAutoTurn=useCallback(()=>{
    if(busyRef.current||stateRef.current.phase==='result') return;
    const cur=stateRef.current;
    const pAlive=getAlive(cur.playerUnits);
    const nAlive=getAlive(cur.npcUnits);
    if(!pAlive.length||!nAlive.length) return;

    let idx=0;
    const attackNext=()=>{
      // 정지 버튼 눌렀으면 중단
      if(!isAutoRef.current) { busyRef.current=false; return; }
      const cur2=stateRef.current;
      const pAlive2=getAlive(cur2.playerUnits);
      const nAlive2=getAlive(cur2.npcUnits);
      if(idx>=pAlive2.length||!nAlive2.length||cur2.winner){
        setState(s=>{if(s.winner) return s;
          return{...s,turn:'npc'};});
        return;
      }
      const atk=pAlive2[idx];
      const preferred=pickTarget(atk,nAlive2);
      if(!preferred){idx++;attackNext();return;}
      const check=canAttack(atk,preferred,[...cur2.playerUnits,...cur2.npcUnits]);
      const def=check.allowed?preferred:(nAlive2.find(u=>u.row===0)??preferred);
      idx++;
      doAttack(atk.uid,def.uid,()=>{
        setTimeout(attackNext,300);
      });
    };
    attackNext();
  },[doAttack]);

  // ── 자동전투: isAuto ON → 양쪽 모두 자동 연속 ──────────
  useEffect(()=>{
    if(!isAuto||state.phase==='result'||busyRef.current) return;
    // speed: 1=보통(1200/1500ms), 2=빠름(600/900ms)
    const base = speed===1 ? 1200 : 600;
    const delay = state.turn==='player' ? base : Math.floor(base*1.5);
    const t=setTimeout(()=>{
      if(state.turn==='player') doPlayerAutoTurn();
      else doNpcTurn();
    },delay);
    return()=>clearTimeout(t);
  },[isAuto,state.turn,state.phase,speed,doPlayerAutoTurn,doNpcTurn]);

  // ── 수동모드: NPC 턴만 자동 ─────────────────────────────
  useEffect(()=>{
    if(isAuto||state.turn!=='npc'||state.phase==='result'||busyRef.current) return;
    const t=setTimeout(doNpcTurn, speed===1?1500:900);
    return()=>clearTimeout(t);
  },[isAuto,state.turn,state.phase,speed,doNpcTurn]);

  const placeUnit=useCallback((uid:string,squad:1|2,row:number,col:number)=>{
    // 예비 카드인지 확인
    const isReserve = reservePlayer.some(u=>u.uid===uid);
    if(isReserve){
      // 예비 → 필드 배치
      const unit=reservePlayer.find(u=>u.uid===uid); if(!unit) return;
      setState(s=>({...s,playerUnits:[...s.playerUnits,{...unit,squad,row,col}]}));
      setReservePlayer(p=>p.filter(u=>u.uid!==uid));
    } else {
      // 필드 내 이동
      setState(s=>({...s,playerUnits:s.playerUnits.map(u=>u.uid===uid?{...u,squad,row,col}:u)}));
    }
  },[reservePlayer]);

  // ── 예비 카드 → 필드 배치 ────────────────────────────────
  const addFromReserve=useCallback((uid:string, side:'player'|'npc')=>{
    if(side==='player'){
      const unit=reservePlayer.find(u=>u.uid===uid); if(!unit) return;
      // 빈 슬롯 찾기
      const cur=stateRef.current.playerUnits;
      let placed=false;
      for(let row=0;row<3&&!placed;row++) for(let col=0;col<4&&!placed;col++){
        if(!cur.find(u=>u.squad===1&&u.row===row&&u.col===col&&!u.isDead)){
          setState(s=>({...s,playerUnits:[...s.playerUnits,{...unit,squad:1,row,col}]}));
          setReservePlayer(p=>p.filter(u=>u.uid!==uid));
          placed=true;
        }
      }
    } else {
      const unit=reserveNpc.find(u=>u.uid===uid); if(!unit) return;
      const cur=stateRef.current.npcUnits;
      let placed=false;
      for(let row=0;row<3&&!placed;row++) for(let col=0;col<4&&!placed;col++){
        if(!cur.find(u=>u.squad===1&&u.row===row&&u.col===col&&!u.isDead)){
          setState(s=>({...s,npcUnits:[...s.npcUnits,{...unit,squad:1,row,col}]}));
          setReserveNpc(p=>p.filter(u=>u.uid!==uid));
          placed=true;
        }
      }
    }
  },[reservePlayer,reserveNpc]);

  // ── 별 게이지: 5턴마다 +1, 10턴마다 추가 +1 ──────────────
  useEffect(()=>{
    if(state.phase==='result'||state.turnNum<=0) return;
    // 매 턴 +1 대신 5턴마다 +1
    if(state.turnNum % 5 === 0) setStarPlayer(s=>s+1);
    if(state.turnNum % 10 === 0) setStarPlayer(s=>s+1); // 10턴 보너스
  },[state.turnNum]);

  const advancePhase=useCallback(()=>{
    setState(s=>({...s,phase:nextPhase(s)}));
  },[]);

  return{
    state,isAuto,setIsAuto,
    selectedUid,setSelectedUid,
    isBusy:busyRef.current,
    playerAttack,doNpcTurn,
    placeUnit,advancePhase,
    reservePlayer,reserveNpc,addFromReserve,
    starPlayer,starNpc,
    bubbles: state.bubbles,
    speed,
  };
}