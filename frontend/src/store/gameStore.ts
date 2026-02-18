import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyScoreToPlayers } from '../api/client';
import type {
  Player,
  RoundState,
  HistoryEntry,
  Wind,
  ScoreResult,
  MeldType,
  MeldFrom,
  GameMode,
} from '../types/mahjong';

interface GameStore {
  // 状態
  players: Player[];
  round: RoundState;
  history: HistoryEntry[];
  isGameStarted: boolean;
  isGameEnded: boolean;
  endReason: string | null;
  gameMode: GameMode;
  enable30000Rule: boolean;
  startedAt: number | null;
  endedAt: number | null;

  // アクション
  startGame: (playerNames: string[], options?: { gameMode?: GameMode; enable30000Rule?: boolean }) => void;
  resetGame: () => void;

  // 和了処理
  applyRon: (
    winnerIndex: number,
    loserIndex: number,
    scoreResult: ScoreResult,
    meta?: { melds?: { type: MeldType; from?: MeldFrom; opened: boolean }[] }
  ) => Promise<void>;
  applyTsumo: (
    winnerIndex: number,
    scoreResult: ScoreResult,
    meta?: { melds?: { type: MeldType; from?: MeldFrom; opened: boolean }[] }
  ) => Promise<void>;
  applyDraw: (tenpaiPlayers: number[]) => void;

  // 局の進行
  advanceRound: (dealerWon: boolean) => void;
  addRiichiStick: (playerIndex: number) => boolean;

  // Undo
  undoLastAction: () => void;
}

const INITIAL_SCORE = 25000;

const getWindForSeat = (seatIndex: number): Wind => {
  const winds: Wind[] = ['east', 'south', 'west', 'north'];
  return winds[seatIndex];
};

const initialRound: RoundState = {
  round: 1,
  honba: 0,
  riichiSticks: 0,
  roundWind: 'east',
  dealerIndex: 0,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      players: [],
      round: initialRound,
      history: [],
      isGameStarted: false,
      isGameEnded: false,
      endReason: null,
      gameMode: 'hanchan',
      enable30000Rule: false,
      startedAt: null,
      endedAt: null,

      startGame: (playerNames: string[], options) => {
        const players: Player[] = playerNames.map((name, index) => ({
          name: name || `プレイヤー${index + 1}`,
          score: INITIAL_SCORE,
          wind: getWindForSeat(index),
        }));

        set({
          players,
          round: initialRound,
          history: [],
          isGameStarted: true,
          isGameEnded: false,
          endReason: null,
          gameMode: options?.gameMode || 'hanchan',
          enable30000Rule: options?.enable30000Rule || false,
          startedAt: Date.now(),
          endedAt: null,
        });
      },

      resetGame: () => {
        set({
          players: [],
          round: initialRound,
          history: [],
          isGameStarted: false,
          isGameEnded: false,
          endReason: null,
          gameMode: 'hanchan',
          enable30000Rule: false,
          startedAt: null,
          endedAt: null,
        });
      },

      applyRon: async (winnerIndex, loserIndex, scoreResult, meta) => {
        const { players, round, history } = get();
        const { scores: nextScores, diff: scoreDiffs } = await applyScoreToPlayers({
          scores: players.map((p) => p.score),
          winnerIndex,
          loserIndex,
          dealerIndex: round.dealerIndex,
          cost: {
            main: scoreResult.cost.main,
            additional: scoreResult.cost.additional,
          },
          isTsumo: false,
          honba: round.honba,
          riichiSticks: round.riichiSticks,
        });
        const newPlayers = players.map((p, i) => ({ ...p, score: nextScores[i] }));

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'ron',
            winnerIndex,
            loserIndex,
            melds: meta?.melds,
            scoreResult,
            scoreDiffs,
          },
          scoresAfter: newPlayers.map(p => p.score),
        };

        set({
          players: newPlayers,
          round: { ...round, riichiSticks: 0 },
          history: [...history, entry],
        });
      },

      applyTsumo: async (winnerIndex, scoreResult, meta) => {
        const { players, round, history } = get();
        const { scores: nextScores, diff: scoreDiffs } = await applyScoreToPlayers({
          scores: players.map((p) => p.score),
          winnerIndex,
          dealerIndex: round.dealerIndex,
          cost: {
            main: scoreResult.cost.main,
            additional: scoreResult.cost.additional,
          },
          isTsumo: true,
          honba: round.honba,
          riichiSticks: round.riichiSticks,
        });
        const newPlayers = players.map((p, i) => ({ ...p, score: nextScores[i] }));

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'tsumo',
            winnerIndex,
            melds: meta?.melds,
            scoreResult,
            scoreDiffs,
          },
          scoresAfter: newPlayers.map(p => p.score),
        };

        set({
          players: newPlayers,
          round: { ...round, riichiSticks: 0 },
          history: [...history, entry],
        });
      },

      applyDraw: (tenpaiPlayers) => {
        const { players, round, history } = get();
        const newPlayers = [...players];
        const scoreDiffs = players.map(() => 0);

        // ノーテン罰符
        const tenpaiCount = tenpaiPlayers.length;
        if (tenpaiCount > 0 && tenpaiCount < 4) {
          const totalPenalty = 3000;
          const payPerNoTen = totalPenalty / (4 - tenpaiCount);
          const receivePerTen = totalPenalty / tenpaiCount;

          for (let i = 0; i < 4; i++) {
            if (tenpaiPlayers.includes(i)) {
              newPlayers[i].score += receivePerTen;
              scoreDiffs[i] = receivePerTen;
            } else {
              newPlayers[i].score -= payPerNoTen;
              scoreDiffs[i] = -payPerNoTen;
            }
          }
        }

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'draw',
            scoreDiffs,
          },
          scoresAfter: newPlayers.map(p => p.score),
        };

        set({
          players: newPlayers,
          history: [...history, entry],
        });
      },

      advanceRound: (dealerWon: boolean) => {
        const { round, players, gameMode, enable30000Rule } = get();
        const topScore = Math.max(...players.map((p) => p.score));
        const dealerScore = players[round.dealerIndex]?.score ?? -Infinity;
        const isEast4 = round.roundWind === 'east' && round.round >= 4;
        const isSouth4 = round.roundWind === 'south' && round.round >= 8;

        // トビ終了（誰かがマイナス）
        if (players.some((p) => p.score < 0)) {
          set({
            round: { ...round },
            isGameEnded: true,
            endReason: 'トビ終了',
            endedAt: Date.now(),
          });
          return;
        }

        // 東風戦の東4局判定
        if (gameMode === 'tonpu' && isEast4) {
          if (!dealerWon) {
            if (enable30000Rule && topScore < 30000) {
              // 30000点未満なら南場へ延長
            } else {
              set({
                round: { ...round, honba: 0 },
                isGameEnded: true,
                endReason: enable30000Rule ? '東4局 30000点終了条件' : '東4局終了',
                endedAt: Date.now(),
              });
              return;
            }
          } else if (enable30000Rule && dealerScore >= 30000 && dealerScore >= topScore) {
            set({
              round: { ...round },
              isGameEnded: true,
              endReason: '東4局 親アガリやめ',
              endedAt: Date.now(),
            });
            return;
          }
        }

        // 半荘の南4局判定
        if (gameMode === 'hanchan' && isSouth4) {
          if (!dealerWon) {
            // 親が連荘しない場合は終局
            set({
              round: { ...round, honba: 0 },
              isGameEnded: true,
              endReason: '南4局終了',
              endedAt: Date.now(),
            });
            return;
          }

          // 親連荘時: 親がトップならアガリやめで終局、それ以外は連荘続行
          if (dealerScore >= topScore) {
            set({
              round: { ...round },
              isGameEnded: true,
              endReason: '南4局 親アガリやめ',
              endedAt: Date.now(),
            });
            return;
          }
        }

        const newRound = { ...round };

        if (dealerWon) {
          // 連荘
          newRound.honba += 1;
        } else {
          // 親流れ
          newRound.honba = 0;
          newRound.dealerIndex = (newRound.dealerIndex + 1) % 4;
          newRound.round += 1;

          // 場風の更新
          if (newRound.round > 4 && newRound.roundWind === 'east') {
            newRound.roundWind = 'south';
          }

          // 風の更新
          const newPlayers = players.map((p, i) => ({
            ...p,
            wind: getWindForSeat((i - newRound.dealerIndex + 4) % 4),
          }));

          set({ players: newPlayers });
        }

        set({ round: newRound });
      },

      addRiichiStick: (playerIndex: number) => {
        const { players, round, history } = get();
        const newPlayers = [...players];
        const riichiPlayer = newPlayers[playerIndex];
        if (!riichiPlayer || riichiPlayer.score < 1000) {
          return false;
        }

        newPlayers[playerIndex].score -= 1000;
        const scoreDiffs = players.map((_, i) => (i === playerIndex ? -1000 : 0));

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'riichi',
            riichiPlayerIndex: playerIndex,
            scoreDiffs,
          },
          scoresAfter: newPlayers.map(p => p.score),
        };

        set({
          players: newPlayers,
          round: { ...round, riichiSticks: round.riichiSticks + 1 },
          history: [...history, entry],
        });

        return true;
      },

      undoLastAction: () => {
        const { history, players } = get();
        if (history.length === 0) return;

        const lastEntry = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        // 前の状態を復元
        const previousScores = newHistory.length > 0
          ? newHistory[newHistory.length - 1].scoresAfter
          : players.map(() => INITIAL_SCORE);

        const newPlayers = players.map((p, i) => ({
          ...p,
          score: previousScores[i],
        }));

        set({
          players: newPlayers,
          round: lastEntry.round,
          history: newHistory,
        });
      },
    }),
    {
      name: 'mahjong-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
