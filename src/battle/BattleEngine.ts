/**
 * BattleEngine.ts
 * 전투 로직 전담
 * - 상태 머신 (Phase)
 * - 데미지 계산 + 속성 상성
 * - 스킬 발동 판정
 * - 1군→2군 시퀀스
 */
import type { CardDefinition } from '../types';

// ── 타입 ──────────────────────────────────────────────────
export type BattlePhase =
  | 'intro'       // 입장 연출
  | 'setup'       // 배치 단계
  | 'squad1'      // 1군 전투
  | 'squad1_end'  // 1군 종료 → 복귀
  | 'squad2'      // 2군 전투
  | 'free'        // 자유 공격 (한쪽 전멸)
  | 'result';     // 결과

export type TurnOwner = 'player' | 'npc';

export interface StatusEffect {
  type: 'buff_atk' | 'buff_def' | 'debuff_atk' | 'debuff_def' | 'stun';
  power: number;
  turnsLeft: number;
}

export interface BattleUnit {
  // 원본 카드 데이터
  card: CardDefinition;
  // 전투 전용
  uid: string;
  currentHp: number;
  isDead: boolean;
  side: 'player' | 'npc';
  squad: 1 | 2;        // 1군 / 2군
  row: number;         // 0~2
  col: number;         // 0~3
  statuses: StatusEffect[];
  skillCooldowns: Record<string, number>;
}

// ── 말풍선 ──────────────────────────────────────────────────
export interface SpeechBubble {
  uid:     string;   // 발화 카드 uid
  text:    string;   // 대사 내용
  type:    'battle' | 'skill' | 'death' | 'victory';
  side:    'player' | 'npc';
  expires: number;   // Date.now() + ttl
}

export interface BattleState {
  phase: BattlePhase;
  turn: TurnOwner;
  turnNum: number;
  playerUnits: BattleUnit[];
  npcUnits: BattleUnit[];
  log: string[];
  winner: 'player' | 'npc' | null;
  bubbles: SpeechBubble[];   // ← 말풍선 목록
}

// ── 속성 상성 ─────────────────────────────────────────────
const ELEM: Record<string, { strong: string; weak: string }> = {
  fire:  { strong:'earth', weak:'water' },
  water: { strong:'fire',  weak:'wind'  },
  wind:  { strong:'water', weak:'earth' },
  earth: { strong:'wind',  weak:'fire'  },
  light: { strong:'dark',  weak:'dark'  },
  dark:  { strong:'light', weak:'light' },
};

export function getElemMul(atk: string, def: string): number {
  const c = ELEM[atk]; if (!c) return 1;
  return c.strong===def ? 1.5 : c.weak===def ? 0.7 : 1;
}

// ── 데미지 계산 ───────────────────────────────────────────
export function calcDamage(atk: BattleUnit, def: BattleUnit): number {
  let ap = atk.card.attack;
  let dp = def.card.defense;
  const mul = getElemMul(atk.card.element, def.card.element);

  // 버프/디버프 적용
  atk.statuses.forEach(s => {
    if (s.type==='buff_atk')   ap = Math.floor(ap * (1 + s.power/100));
    if (s.type==='debuff_atk') ap = Math.floor(ap * (1 - s.power/100));
  });
  def.statuses.forEach(s => {
    if (s.type==='buff_def')   dp = Math.floor(dp * (1 + s.power/100));
    if (s.type==='debuff_def') dp = Math.floor(dp * (1 - s.power/100));
  });

  // 원거리 방어 무시 30%
  const ignore = atk.card.attackType==='ranged' ? 0.3 : 0;
  return Math.max(1, Math.floor(ap * mul) - Math.floor(dp * (1-ignore)));
}

// ── 스킬 발동 판정 ────────────────────────────────────────
export function tryTriggerSkill(unit: BattleUnit): any | null {
  // equippedAbilities (마법탭 장착) + skills (템플릿/카드탭) 둘 다 체크
  const equip  = (unit.card as any).equippedAbilities ?? [];
  const skills = (unit.card as any).skills ?? [];
  const abilities = [...equip, ...skills].filter(Boolean);

  const active = abilities.filter((a: any) =>
    a.abilityType === 'skill' || a.abilityType === 'magic' ||
    a.name // skills 배열은 abilityType 없을 수 있음
  );

  for (const sk of active) {
    if ((unit.skillCooldowns[sk.id] ?? 0) > 0) continue;
    const chance = sk.triggerChance ?? (sk.abilityType === 'magic' ? 40 : 30);
    if (Math.random() * 100 < chance) {
      const normalized = { ...sk };
      // effectType 정규화
      if (!normalized.effectType || normalized.effectType === 'attack') {
        normalized.effectType = 'damage';
      } else if (normalized.effectType === 'defense') {
        normalized.effectType = 'buff_def';
      } else if (normalized.effectType === 'status') {
        normalized.effectType = 'stun';
      }
      if (!normalized.power) normalized.power = 30;
      if (!normalized.id) normalized.id = `sk_${Math.random()}`;
      return normalized;
    }
  }
  return null;
}

// ── 유닛 생성 헬퍼 ───────────────────────────────────────
let _uid = 0;
export function mkUnit(
  card: CardDefinition,
  side: 'player' | 'npc',
  squad: 1 | 2,
  row: number,
  col: number
): BattleUnit {
  return {
    card, uid: `u${Date.now()}${++_uid}`,
    currentHp: card.health, isDead: false,
    side, squad, row, col,
    statuses: [], skillCooldowns: {},
  };
}

// ── 덱 → 유닛 배치 (자동 절반 배치) ─────────────────────
export function buildUnits(
  cards: CardDefinition[],
  side: 'player' | 'npc'
): { squad1: BattleUnit[]; squad2: BattleUnit[] } {
  const half = Math.ceil(cards.length / 2);
  const s1cards = cards.slice(0, half);
  const s2cards = cards.slice(half);

  // warrior→row0, archer→row1, priest→row2
  const place = (cds: CardDefinition[], squad: 1|2): BattleUnit[] => {
    const byPos: Record<string, CardDefinition[]> = {warrior:[],archer:[],priest:[]};
    cds.forEach(c => (byPos[c.position]||byPos.warrior).push(c));
    const units: BattleUnit[] = [];
    (['warrior','archer','priest'] as const).forEach((pos, row) => {
      byPos[pos].forEach((c, col) => {
        if (col < 4) units.push(mkUnit(c, side, squad, row, col));
      });
    });
    return units;
  };

  return { squad1: place(s1cards, 1), squad2: place(s2cards, 2) };
}

// ── 초기 BattleState 생성 ────────────────────────────────
export function initBattleState(
  playerCards: CardDefinition[],
  npcCards: CardDefinition[]
): BattleState {
  const { squad1: ps1, squad2: ps2 } = buildUnits(playerCards, 'player');
  const { squad1: ns1, squad2: ns2 } = buildUnits(npcCards, 'npc');

  return {
    phase: 'intro',
    turn: 'player',
    turnNum: 1,
    playerUnits: [...ps1, ...ps2],
    npcUnits: [...ns1, ...ns2],
    log: ['⚔️ 전투 시작!'],
    winner: null,
    bubbles: [],
  };
}

// ── 상태 체크 ─────────────────────────────────────────────
export function getAlive(units: BattleUnit[], squad?: 1|2): BattleUnit[] {
  return units.filter(u => !u.isDead && (squad ? u.squad===squad : true));
}

export function checkWinner(state: BattleState): 'player'|'npc'|null {
  const aliveP = getAlive(state.playerUnits).length;
  const aliveN = getAlive(state.npcUnits).length;
  if (aliveN===0) return 'player';
  if (aliveP===0) return 'npc';
  return null;
}

// ── 다음 페이즈 결정 ─────────────────────────────────────
export function nextPhase(state: BattleState): BattlePhase {
  const s1p = getAlive(state.playerUnits, 1).length;
  const s1n = getAlive(state.npcUnits, 1).length;
  if (state.phase==='squad1' && (s1p===0||s1n===0)) return 'squad1_end';
  if (state.phase==='squad1_end') return 'squad2';
  const winner = checkWinner(state);
  if (winner) return 'result';
  return state.phase;
}

// ── 상태이상 틱 ───────────────────────────────────────────
export function tickStatuses(units: BattleUnit[]): BattleUnit[] {
  return units.map(u => ({
    ...u,
    statuses: u.statuses
      .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
      .filter(s => s.turnsLeft > 0),
    skillCooldowns: Object.fromEntries(
      Object.entries(u.skillCooldowns).map(([k,v]) => [k, Math.max(0,v-1)])
    ),
  }));
}

// ── 데미지 적용 ───────────────────────────────────────────
export function applyDamage(
  units: BattleUnit[],
  targetUid: string,
  dmg: number
): BattleUnit[] {
  return units.map(u => {
    if (u.uid !== targetUid) return u;
    const hp = Math.max(0, u.currentHp - dmg);
    return { ...u, currentHp: hp, isDead: hp <= 0 };
  });
}

// ── 회복 적용 ────────────────────────────────────────────
export function applyHeal(
  units: BattleUnit[],
  targetUid: string,
  amount: number
): BattleUnit[] {
  return units.map(u => {
    if (u.uid !== targetUid) return u;
    return { ...u, currentHp: Math.min(u.card.health, u.currentHp + amount) };
  });
}

// ── 1열 탱크 로직 ────────────────────────────────────────
// 아군 1열 존재 시: 근접만 차단, 원거리·마법은 통과
export function canAttack(
  atk: BattleUnit,
  def: BattleUnit,
  allUnits: BattleUnit[]
): { allowed: boolean; reason?: string } {
  const atkSide = atk.side;
  const defSide = def.side;

  // 같은 편 공격 불가
  if (atkSide === defSide) return { allowed: false, reason: '아군' };

  const defTeam = allUnits.filter(u => u.side===defSide && !u.isDead);

  // 방어팀 1열(row=0) 생존 여부
  const frontlineAlive = defTeam.some(u => u.row===0);

  // 원거리·마법은 항상 공격 가능
  if (atk.card.attackType === 'ranged' || atk.card.attackType === 'magic') {
    return { allowed: true };
  }

  // 근접: 1열이 살아있으면 1열만 공격 가능
  if (frontlineAlive) {
    if (def.row !== 0) {
      return { allowed: false, reason: '1열이 막고 있음' };
    }
  }

  return { allowed: true };
}

// ── 자동 전투 타겟 선택 ───────────────────────────────────
export function pickTarget(
  atk: BattleUnit,
  enemies: BattleUnit[]
): BattleUnit | null {
  const alive = enemies.filter(u => !u.isDead);
  if (!alive.length) return null;
  const frontline = alive.filter(u => u.row === 0);
  if (atk.card.attackType === 'melee') {
    return frontline.length
      ? frontline[Math.floor(Math.random() * frontline.length)]
      : alive[Math.floor(Math.random() * alive.length)];
  }
  // 원거리·마법: 후열 우선
  const backline = alive.filter(u => u.row > 0);
  const pool = backline.length ? backline : alive;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 상태이상 부여 ────────────────────────────────────────
export function applyStatus(
  units: BattleUnit[],
  targetUid: string,
  status: StatusEffect
): BattleUnit[] {
  return units.map(u => {
    if (u.uid !== targetUid) return u;
    return {
      ...u,
      statuses: [...u.statuses.filter(s=>s.type!==status.type), status],
    };
  });
}