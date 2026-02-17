import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Player, RoundState, HistoryEntry, Wind, ScoreResult } from '../types/mahjong';

interface GameStore {
  // 状態
  players: Player[];
  round: RoundState;
  history: HistoryEntry[];
  isGameStarted: boolean;

  // アクション
  startGame: (playerNames: string[]) => void;
  resetGame: () => void;

  // 和了処理
  applyRon: (winnerIndex: number, loserIndex: number, scoreResult: ScoreResult) => void;
  applyTsumo: (winnerIndex: number, scoreResult: ScoreResult) => void;
  applyDraw: (tenpaiPlayers: number[]) => void;

  // 局の進行
  advanceRound: (dealerWon: boolean) => void;
  addRiichiStick: (playerIndex: number) => void;

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

      startGame: (playerNames: string[]) => {
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
        });
      },

      resetGame: () => {
        set({
          players: [],
          round: initialRound,
          history: [],
          isGameStarted: false,
        });
      },

      applyRon: (winnerIndex, loserIndex, scoreResult) => {
        const { players, round, history } = get();
        const newPlayers = [...players];
        const { main } = scoreResult.cost;
        const honbaBonus = round.honba * 300;
        const riichiBonus = round.riichiSticks * 1000;

        // 点数移動
        const totalWin = main + honbaBonus + riichiBonus;
        newPlayers[winnerIndex].score += totalWin;
        newPlayers[loserIndex].score -= main + honbaBonus;

        const scoreDiffs = players.map((_, i) => {
          if (i === winnerIndex) return totalWin;
          if (i === loserIndex) return -(main + honbaBonus);
          return 0;
        });

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'ron',
            winnerIndex,
            loserIndex,
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

      applyTsumo: (winnerIndex, scoreResult) => {
        const { players, round, history } = get();
        const newPlayers = [...players];
        const { main, additional } = scoreResult.cost;
        const honbaBonus = round.honba * 300;
        const riichiBonus = round.riichiSticks * 1000;
        const isWinnerDealer = winnerIndex === round.dealerIndex;

        let totalWin = riichiBonus;
        const scoreDiffs = players.map(() => 0);

        for (let i = 0; i < 4; i++) {
          if (i === winnerIndex) continue;

          let payment: number;
          if (isWinnerDealer) {
            // 親のツモ: 全員から main を支払う
            payment = main + Math.ceil(honbaBonus / 3);
          } else {
            // 子のツモ: 親は main、子は additional
            if (i === round.dealerIndex) {
              payment = main + Math.ceil(honbaBonus / 3);
            } else {
              payment = additional + Math.ceil(honbaBonus / 3);
            }
          }

          newPlayers[i].score -= payment;
          scoreDiffs[i] = -payment;
          totalWin += payment;
        }

        newPlayers[winnerIndex].score += totalWin;
        scoreDiffs[winnerIndex] = totalWin;

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          round: { ...round },
          result: {
            type: 'tsumo',
            winnerIndex,
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
        const { round, players } = get();
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
        const { players, round } = get();
        const newPlayers = [...players];
        newPlayers[playerIndex].score -= 1000;

        set({
          players: newPlayers,
          round: { ...round, riichiSticks: round.riichiSticks + 1 },
        });
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
