// 牌の種類
export type TileSuit = 'man' | 'pin' | 'sou' | 'honor';

// 牌のID (例: "1m", "5p", "9s", "1z"〜"7z")
export type TileId = string;

// 風
export type Wind = 'east' | 'south' | 'west' | 'north';

// 副露の種類
export type MeldType = 'chi' | 'pon' | 'kan' | 'ankan';

// 牌の入力形式
export interface TileInput {
  man: string;
  pin: string;
  sou: string;
  honors: string;
}

// 副露
export interface Meld {
  type: MeldType;
  tiles: TileInput;
  opened: boolean;
}

// 計算リクエスト
export interface CalculateRequest {
  hand: TileInput;
  win_tile: TileInput;
  melds: Meld[];
  dora_indicators: TileInput;
  player_wind: Wind;
  round_wind: Wind;
  is_tsumo: boolean;
  is_riichi: boolean;
  is_ippatsu: boolean;
  is_rinshan: boolean;
  is_chankan: boolean;
  is_haitei: boolean;
  is_daburu_riichi: boolean;
  is_tenhou: boolean;
  is_chiihou: boolean;
}

// 役
export interface Yaku {
  name: string;
  han: number;
}

// 計算結果
export interface ScoreResult {
  han: number;
  fu: number;
  cost: {
    main: number;
    additional: number;
    total: number;
  };
  yaku: Yaku[];
  error?: string;
}

// プレイヤー
export interface Player {
  name: string;
  score: number;
  wind: Wind;
}

// 局の状態
export interface RoundState {
  round: number; // 1-8 (東1〜南4)
  honba: number; // 本場
  riichiSticks: number; // 供託
  roundWind: Wind; // 場風
  dealerIndex: number; // 親のインデックス
}

// 履歴エントリ
export interface HistoryEntry {
  id: string;
  timestamp: number;
  round: RoundState;
  result: {
    type: 'ron' | 'tsumo' | 'draw' | 'chombo';
    winnerIndex?: number;
    loserIndex?: number;
    scoreResult?: ScoreResult;
    scoreDiffs: number[]; // [東, 南, 西, 北]
  };
  scoresAfter: number[];
}

// ゲーム状態
export interface GameState {
  players: Player[];
  round: RoundState;
  history: HistoryEntry[];
}
