/**
 * useCollection.ts
 * 컬렉션 데이터 관리 훅
 * - localStorage 저장/로드
 * - 최초 시작 시 랜덤 5장 자동 등록
 * - activeDeck (최대 12개)
 * - 카드 조합 (같은 레벨 2장 → 상위)
 * - 별 → 가차
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { CardDefinition } from '../types';

export interface CollectionCard {
  uid:       string;
  baseId:    string;
  level:     number;       // 1~5
  name:      string;
  attack:    number;
  defense:   number;
  health:    number;
  element:   string;
  rarity:    string;
  attackType:string;
  position:  string;
  imageUrl?: string;
  equippedAbilities?: any[];
  // ── 대사/미디어 ──────────────────────────────────────
  battleDialogue?:  string;
  waitDialogue?:    string;
  skillDialogue?:   string;
  deathDialogue?:   string;
  victoryDialogue?: string;
  soundUrl?:        string;
  soundName?:       string;
  description?:     string;
  deathImageUrl?:   string;
}

export interface CollectionData {
  heroName:     string;
  heroImageUrl: string | null;
  cards:        CollectionCard[];
  activeDeck:   string[];       // CollectionCard.uid 목록 (최대 12)
  stars:        number;
}

// 희귀도별 별 비용
export const GACHA_COST = { normal:3, bronze:10, silver:20, gold:50 };

// 기본 데이터
const DEFAULT: CollectionData = {
  heroName:     '모험가',
  heroImageUrl: null,
  cards:        [],
  activeDeck:   [],
  stars:        0,
};

const STORAGE_KEY = 'ms_collection';

function load(): CollectionData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { ...DEFAULT };
}

function save(data: CollectionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// 카드 → CollectionCard 변환
function toCollectionCard(card: CardDefinition, level=1): CollectionCard {
  return {
    uid:      `cc_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
    baseId:   card.id,
    level,
    name:     card.name,
    attack:   card.attack,
    defense:  card.defense,
    health:   card.health,
    element:  card.element,
    rarity:   card.rarity,
    attackType: card.attackType,
    position:   card.position,
    imageUrl:   card.imageUrl,
    equippedAbilities: (card as any).equippedAbilities ?? [],
    // ── 대사/미디어 필드 보존 ────────────────────────────
    battleDialogue:  (card as any).battleDialogue,
    waitDialogue:    (card as any).waitDialogue,
    skillDialogue:   (card as any).skillDialogue,
    deathDialogue:   (card as any).deathDialogue,
    victoryDialogue: (card as any).victoryDialogue,
    soundUrl:        (card as any).soundUrl,
    soundName:       (card as any).soundName,
    description:     (card as any).description,
    deathImageUrl:   (card as any).deathImageUrl,
  };
}

// CollectionCard → CardDefinition (배틀용)
export function toCombatCard(cc: CollectionCard): CardDefinition {
  return {
    id: cc.uid,
    name: cc.name,
    cardType: 'battle',
    element: cc.element as any,
    attackType: cc.attackType as any,
    attackEffect: cc.attackType as any,
    position: cc.position as any,
    attack: cc.attack,
    defense: cc.defense,
    health: cc.health,
    canBuff: cc.position === 'priest',
    buffType: 'none',
    rarity: cc.rarity as any,
    copies: 1,
    source: 'reward',
    imageUrl: cc.imageUrl,
    equippedAbilities: cc.equippedAbilities,
    // ── 대사/미디어 필드 전달 ────────────────────────────
    battleDialogue:  cc.battleDialogue,
    waitDialogue:    cc.waitDialogue,
    skillDialogue:   cc.skillDialogue,
    deathDialogue:   cc.deathDialogue,
    victoryDialogue: cc.victoryDialogue,
    soundUrl:        cc.soundUrl,
    soundName:       cc.soundName,
    description:     cc.description,
    deathImageUrl:   cc.deathImageUrl,
  } as any;
}

export function useCollection(allCards: CardDefinition[]) {
  const [data, setData] = useState<CollectionData>(()=>load());
  const initializedRef = useRef(false);
  const prevCardCount  = useRef(0);

  // 데이터 변경 시 저장
  useEffect(()=>{ save(data); },[data]);

  // 새 게임 파일 로드 감지 → 컬렉션 재초기화
  useEffect(() => {
    if (!allCards.length) return;
    // 카드 수가 바뀌거나 최초 1회
    if (initializedRef.current && prevCardCount.current === allCards.length) return;
    initializedRef.current = true;
    prevCardCount.current  = allCards.length;

    setData(prev => {
      // 전체 카드로 컬렉션 재구성
      const cards = allCards.map(c=>toCollectionCard(c,1));
      // 기존 activeDeck uid 보존 시도, 없으면 처음 12장
      const validUids = new Set(cards.map(c=>c.uid));
      const oldDeck   = prev.activeDeck.filter(u=>validUids.has(u));
      const activeDeck = oldDeck.length > 0
        ? oldDeck
        : cards.slice(0, Math.min(12, cards.length)).map(c=>c.uid);
      return { ...prev, cards, activeDeck };
    });
  }, [allCards.length]);

  // 주인공 이름/이미지 수정
  const setHeroName = useCallback((name:string)=>{
    setData(p=>({...p, heroName:name}));
  },[]);

  const setHeroImage = useCallback((url:string|null)=>{
    setData(p=>({...p, heroImageUrl:url}));
  },[]);

  // activeDeck 토글 (최대 12)
  const toggleActiveDeck = useCallback((uid:string)=>{
    setData(p=>{
      const inDeck = p.activeDeck.includes(uid);
      if (inDeck) return { ...p, activeDeck: p.activeDeck.filter(x=>x!==uid) };
      if (p.activeDeck.length >= 12) return p; // 최대 초과
      return { ...p, activeDeck: [...p.activeDeck, uid] };
    });
  },[]);

  // 카드 조합 (같은 레벨 2장 → 상위 레벨)
  const combineCards = useCallback((uid1:string, uid2:string)=>{
    setData(p=>{
      const c1=p.cards.find(c=>c.uid===uid1);
      const c2=p.cards.find(c=>c.uid===uid2);
      if(!c1||!c2) return p;
      if(c1.level !== c2.level) return p; // 같은 레벨만
      if(c1.level >= 5) return p;         // 최대 레벨 초과

      const bonus = 1 + Math.floor(Math.random()*2); // +1~2
      const newCard: CollectionCard = {
        uid: `cc_${Date.now()}_combined`,
        baseId: c1.baseId,
        level: c1.level + 1,
        name: c1.name,
        attack:  Math.floor((c1.attack  + c2.attack)  / 2) + bonus,
        defense: Math.floor((c1.defense + c2.defense) / 2) + bonus,
        health:  Math.floor((c1.health  + c2.health)  / 2) + bonus * 5,
        element:     c1.element,
        rarity:      c1.level+1 >= 3 ? 'silver' : c1.rarity,
        attackType:  c1.attackType,
        position:    c1.position,
        imageUrl:    c1.imageUrl,
        equippedAbilities: c1.equippedAbilities,
      };

      // 원본 2장 제거, 신규 추가
      const cards = p.cards
        .filter(c=>c.uid!==uid1&&c.uid!==uid2)
        .concat(newCard);
      const activeDeck = p.activeDeck
        .filter(x=>x!==uid1&&x!==uid2)
        .concat(newCard.uid);

      return { ...p, cards, activeDeck };
    });
  },[]);

  // 가차 (별 소비)
  const gachaByStars = useCallback((rarity:'normal'|'bronze'|'silver'|'gold')=>{
    const cost = GACHA_COST[rarity];
    setData(p=>{
      if(p.stars < cost) return p;
      // 해당 희귀도 카드 풀
      const pool = allCards.filter(c=>c.rarity===rarity);
      const base = pool.length > 0
        ? pool[Math.floor(Math.random()*pool.length)]
        : allCards[Math.floor(Math.random()*allCards.length)];
      const newCard = toCollectionCard(base, 1);
      return {
        ...p,
        stars: p.stars - cost,
        cards: [...p.cards, newCard],
      };
    });
  },[allCards]);

  // 주인공 카드 설정 (드래그앤드롭)
  const setHeroCard = useCallback((uid:string)=>{
    setData(p=>{
      // activeDeck 첫 번째로 이동
      const filtered = p.activeDeck.filter(x=>x!==uid);
      return { ...p, activeDeck: [uid, ...filtered].slice(0,12) };
    });
  },[]);

  // 스탯 직접 업그레이드 (heroCard)
  const upgradeStat = useCallback((stat:'attack'|'defense'|'health')=>{
    setData(p=>{
      if(!p.activeDeck.length) return p;
      const heroUid = p.activeDeck[0];
      const cards = p.cards.map(c=>{
        if(c.uid!==heroUid) return c;
        return {
          ...c,
          attack:  stat==='attack'  ? c.attack  + 1 : c.attack,
          defense: stat==='defense' ? c.defense + 1 : c.defense,
          health:  stat==='health'  ? c.health  + 10 : c.health,
        };
      });
      return { ...p, cards };
    });
  },[]);

  // 주인공 카드 스탯 보너스 (스테이지 클리어)
  const addHeroBonus = useCallback((stat:'attack'|'defense', amount:number)=>{
    setData(p=>{
      if(p.activeDeck.length===0) return p;
      // activeDeck 첫 번째 카드에 보너스
      const heroUid = p.activeDeck[0];
      const cards = p.cards.map(c=>{
        if(c.uid!==heroUid) return c;
        return {
          ...c,
          attack:  stat==='attack'  ? c.attack  + amount : c.attack,
          defense: stat==='defense' ? c.defense + amount : c.defense,
        };
      });
      return { ...p, cards };
    });
  },[]);

  // 별 추가 (배틀에서 호출)
  const addStars = useCallback((amount:number)=>{
    setData(p=>({...p, stars: p.stars + amount}));
  },[]);

  // activeDeck 카드 → CardDefinition 배열 (전투용)
  const getActiveDeckCards = useCallback(():CardDefinition[]=>{
    return data.activeDeck
      .map(uid=>data.cards.find(c=>c.uid===uid))
      .filter(Boolean)
      .map(c=>toCombatCard(c!));
  },[data.activeDeck, data.cards]);

  return {
    data,
    setHeroName, setHeroImage, setHeroCard,
    toggleActiveDeck, combineCards,
    gachaByStars, addStars, addHeroBonus,
    upgradeStat, getActiveDeckCards,
  };
}