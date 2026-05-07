/**
 * types/index.ts v2
 * 실행기 연동을 위한 타입 확장
 */

export type CardType    = "battle" | "summon";
export type ElementType = "fire" | "water" | "wind" | "light" | "dark" | "earth";
export type AttackType  = "melee" | "magic" | "ranged";
export type BuffType    = "none" | "physical-defense" | "attack-up" | "health-recovery";
export type Rarity      = "normal" | "bronze" | "silver" | "gold";
export type Position    = "warrior" | "archer" | "priest";
export type Weather     = "none" | "rain" | "snow" | "fog";

// ── 카드 ─────────────────────────────────────────────────
export interface CardDefinition {
  id: string;
  name: string;
  cardType: CardType;
  element: ElementType;
  attackType: AttackType;
  attackEffect: AttackType;
  position: Position;
  attack: number;
  health: number;
  defense: number;
  canBuff: boolean;
  buffType: BuffType;
  rarity: Rarity;
  copies: number;
  source: "uploaded" | "reward" | "enemy";
  // 미디어
  imageUrl?: string;
  imageName?: string;
  soundUrl?: string;
  soundName?: string;
  victoryUrl?: string;
  victoryName?: string;
  // 대사
  battleDialogue?: string;
  waitDialogue?: string;
  deathDialogue?: string;
  victoryDialogue?: string;
  // ── 실행기 확장: 주요 인물 ──────────────────────────────
  isHero?: boolean;          // 주요 인물 체크
  heroRole?: "main" | "sub"; // 주인공 / 조력자
}

// ── 배틀 카드 ─────────────────────────────────────────────
export interface BattleCard extends CardDefinition {
  currentHealth: number;
  isDead: boolean;
  battlePosition: number;
}

// ── 배틀 상태 ─────────────────────────────────────────────
export interface BattleState {
  phase: "idle" | "fighting" | "ended";
  turn: number;
  result: "player" | "npc" | null;
}

// ── 덱 ───────────────────────────────────────────────────
export interface Deck {
  id: string;
  name: string;
  deckType: "user" | "npc";
  cardIds: string[];
  linkedMapId?: string;
  createdAt: string;
}

// ── 맵 스크립트 씬 (실행기 대사 연출) ────────────────────
export interface ScriptScene {
  id: string;
  characterCardId: string;   // 주요인물 카드 ID
  dialogue: string;          // 대사
  delay: number;             // 맵 입장 후 N초
  position: "left" | "right" | "center"; // 화면 위치
  emotion: "normal" | "happy" | "angry" | "sad"; // 표정 (나중에 CSS로)
}

// ── 게임 맵 ───────────────────────────────────────────────
export interface GameMap {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  level: number;
  backgroundUrl?: string;
  backgroundName?: string;
  npcDeckId?: string;
  weather: Weather;
  script?: string;             // 레거시 (간단 텍스트)
  scripts?: ScriptScene[];     // 실행기용 씬 배열
  characters: MapCharacter[];
  // 미디어
  bgmUrl?: string;
  bgmName?: string;
  characterPngUrl?: string;
  characterPngName?: string;
  weatherEnabled?: boolean;
}

// ── 맵 캐릭터 ─────────────────────────────────────────────
export interface MapCharacter {
  id: string;
  pngUrl?: string;
  pngName?: string;
  voiceUrl?: string;
  voiceName?: string;
  dialogue?: string;
}

// ── 챕터 ─────────────────────────────────────────────────
export interface Chapter {
  id: string;
  number: number;
  title: string;
  mapIds: string[];
  // ── 실행기 확장: 화면 배경 ───────────────────────────────
  titleBgUrl?: string;    // 시작화면 배경 PNG
  titleBgName?: string;
  mapBgUrl?: string;      // 맵화면 배경 PNG (세로 스크롤)
  mapBgName?: string;
  chapterBgmUrl?: string; // 챕터 BGM
  chapterBgmName?: string;
}

// ── 게임 설정 ─────────────────────────────────────────────
export interface GameConfig {
  bgm?: { url?: string; name?: string; volume: number; loop: boolean; };
  theme: { primaryColor: string; backgroundColor: string; accentColor: string; };
}

// ── 프로젝트 ──────────────────────────────────────────────
export interface ProjectData {
  id: string;
  meta: {
    title: string;
    version: string;
    author: string;
    description: string;
    createdAt: string;
  };
  cards: CardDefinition[];
  decks: Deck[];
  chapters: Chapter[];
  maps: GameMap[];
  config: GameConfig;
}

// ── 실행기 내보내기 전체 구조 ─────────────────────────────
export interface RunnerExportData {
  // 메타
  meta: {
    title: string;
    author: string;
    version: string;
    exportDate: string;
    description: string;
  };
  // 게임 데이터
  cards: CardDefinition[];
  decks: Deck[];
  chapters: Chapter[];
  maps: GameMap[];
  // 확장 데이터
  abilities: any[];   // Ability[]
  templates: any[];   // CardTemplate[]
  // 실행기 설정
  runner: {
    // 주요 인물 (isHero 카드 ID 목록)
    heroCardIds: string[];
    // 가차 풀
    gacha: {
      pool: string[];  // cardId[]
      rates: { normal:number; bronze:number; silver:number; gold:number; };
    };
    // 배틀 설정
    battle: {
      fieldRows: number;   // 3
      fieldCols: number;   // 8 (실행기)
      maxDeckSize: number; // 10
      zoomLevels: number[]; // [100, 300, 500]
    };
    // 시작화면 설정
    titleScreen: {
      bgUrl?: string;   // 시작화면 배경
      bgmUrl?: string;  // 타이틀 BGM
      effect: "snow" | "rain" | "none"; // 파티클 효과
    };
    // 다국어
    languages: string[];
  };
  config: GameConfig;
}