export type ScoreCost = { main: number; additional: number };

const SCORE_PRESETS = {
  ron: {
    1: { 30: 1000, 40: 1300, 50: 1600, 60: 2000, 70: 2300, 80: 2600, 90: 2900, 100: 3200, 110: 3600 },
    2: { 25: 1600, 30: 2000, 40: 2600, 50: 3200, 60: 3900, 70: 4500, 80: 5200, 90: 5800, 100: 6400, 110: 7100 },
    3: { 25: 3200, 30: 3900, 40: 5200, 50: 6400, 60: 7700, 70: 8000, 80: 8000, 90: 8000, 100: 8000, 110: 8000 },
    4: { 25: 6400, 30: 7700, 40: 8000, 50: 8000, 60: 8000, 70: 8000, 80: 8000, 90: 8000, 100: 8000, 110: 8000 },
    5: { 0: 8000 },
    6: { 0: 12000 },
    7: { 0: 12000 },
    8: { 0: 16000 },
    9: { 0: 16000 },
    10: { 0: 16000 },
    11: { 0: 24000 },
    12: { 0: 24000 },
    13: { 0: 32000 },
  } as Record<number, Record<number, number>>,
  tsumo: {
    1: { 30: [500, 300], 40: [700, 400], 50: [800, 400], 60: [1000, 500], 70: [1200, 600], 80: [1300, 700], 90: [1500, 800], 100: [1600, 800], 110: [1800, 900] },
    2: { 25: [800, 400], 30: [1000, 500], 40: [1300, 700], 50: [1600, 800], 60: [2000, 1000], 70: [2300, 1200], 80: [2600, 1300], 90: [2900, 1500], 100: [3200, 1600], 110: [3600, 1800] },
    3: { 25: [1600, 800], 30: [2000, 1000], 40: [2600, 1300], 50: [3200, 1600], 60: [3900, 2000], 70: [4000, 2000], 80: [4000, 2000], 90: [4000, 2000], 100: [4000, 2000], 110: [4000, 2000] },
    4: { 25: [3200, 1600], 30: [3900, 2000], 40: [4000, 2000], 50: [4000, 2000], 60: [4000, 2000], 70: [4000, 2000], 80: [4000, 2000], 90: [4000, 2000], 100: [4000, 2000], 110: [4000, 2000] },
    5: { 0: [4000, 2000] },
    6: { 0: [6000, 3000] },
    7: { 0: [6000, 3000] },
    8: { 0: [8000, 4000] },
    9: { 0: [8000, 4000] },
    10: { 0: [8000, 4000] },
    11: { 0: [12000, 6000] },
    12: { 0: [12000, 6000] },
    13: { 0: [16000, 8000] },
  } as Record<number, Record<number, [number, number]>>,
};

export function calculateScoreCost(params: {
  isTsumo: boolean;
  han: number;
  fu: number;
  isWinnerDealer: boolean;
}): ScoreCost | null {
  const { isTsumo, han, fu, isWinnerDealer } = params;
  const scoreTable = isTsumo ? SCORE_PRESETS.tsumo : SCORE_PRESETS.ron;
  const hanScores = scoreTable[han];
  if (!hanScores) return null;

  const effectiveFu = han >= 5 ? 0 : fu;
  const score = hanScores[effectiveFu];
  if (!score) return null;

  if (isTsumo) {
    const [dealerPay, nonDealerPay] = score as [number, number];
    return isWinnerDealer
      ? { main: dealerPay, additional: dealerPay }
      : { main: dealerPay, additional: nonDealerPay };
  }

  const ronScore = score as number;
  const finalScore = isWinnerDealer ? Math.ceil((ronScore * 1.5) / 100) * 100 : ronScore;
  return { main: finalScore, additional: 0 };
}
