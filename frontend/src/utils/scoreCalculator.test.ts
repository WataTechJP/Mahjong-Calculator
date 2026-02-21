import { calculateScoreCost } from './scoreCalculator';

const CHILD_RON_TABLE: Record<number, Record<number, number>> = {
  1: { 30: 1000, 40: 1300, 50: 1600, 60: 2000, 70: 2300, 80: 2600, 90: 2900, 100: 3200, 110: 3600 },
  2: { 25: 1600, 30: 2000, 40: 2600, 50: 3200, 60: 3900, 70: 4500, 80: 5200, 90: 5800, 100: 6400, 110: 7100 },
  3: { 25: 3200, 30: 3900, 40: 5200, 50: 6400, 60: 7700, 70: 8000, 80: 8000, 90: 8000, 100: 8000, 110: 8000 },
  4: { 25: 6400, 30: 7700, 40: 8000, 50: 8000, 60: 8000, 70: 8000, 80: 8000, 90: 8000, 100: 8000, 110: 8000 },
};

const CHILD_TSUMO_TABLE: Record<number, Record<number, [number, number]>> = {
  1: { 30: [500, 300], 40: [700, 400], 50: [800, 400], 60: [1000, 500], 70: [1200, 600], 80: [1300, 700], 90: [1500, 800], 100: [1600, 800], 110: [1800, 900] },
  2: { 25: [800, 400], 30: [1000, 500], 40: [1300, 700], 50: [1600, 800], 60: [2000, 1000], 70: [2300, 1200], 80: [2600, 1300], 90: [2900, 1500], 100: [3200, 1600], 110: [3600, 1800] },
  3: { 25: [1600, 800], 30: [2000, 1000], 40: [2600, 1300], 50: [3200, 1600], 60: [3900, 2000], 70: [4000, 2000], 80: [4000, 2000], 90: [4000, 2000], 100: [4000, 2000], 110: [4000, 2000] },
  4: { 25: [3200, 1600], 30: [3900, 2000], 40: [4000, 2000], 50: [4000, 2000], 60: [4000, 2000], 70: [4000, 2000], 80: [4000, 2000], 90: [4000, 2000], 100: [4000, 2000], 110: [4000, 2000] },
};

const LIMIT_HAND_CHILD_RON: Record<number, number> = {
  5: 8000,
  6: 12000,
  7: 12000,
  8: 16000,
  9: 16000,
  10: 16000,
  11: 24000,
  12: 24000,
  13: 32000,
};

const LIMIT_HAND_CHILD_TSUMO: Record<number, [number, number]> = {
  5: [4000, 2000],
  6: [6000, 3000],
  7: [6000, 3000],
  8: [8000, 4000],
  9: [8000, 4000],
  10: [8000, 4000],
  11: [12000, 6000],
  12: [12000, 6000],
  13: [16000, 8000],
};

describe('calculateScoreCost', () => {
  test('returns ron score for non-dealer winner', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 3,
      fu: 40,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 5200, additional: 0 });
  });

  test('returns rounded ron score for dealer winner', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 3,
      fu: 40,
      isWinnerDealer: true,
    });

    expect(result).toEqual({ main: 7800, additional: 0 });
  });

  test('returns tsumo split for non-dealer winner', () => {
    const result = calculateScoreCost({
      isTsumo: true,
      han: 2,
      fu: 30,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 1000, additional: 500 });
  });

  test('returns tsumo all for dealer winner', () => {
    const result = calculateScoreCost({
      isTsumo: true,
      han: 2,
      fu: 30,
      isWinnerDealer: true,
    });

    expect(result).toEqual({ main: 1000, additional: 1000 });
  });

  test('uses mangan+ table regardless of fu', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 5,
      fu: 30,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 8000, additional: 0 });
  });

  test('returns null for unsupported combination', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 1,
      fu: 25,
      isWinnerDealer: false,
    });

    expect(result).toBeNull();
  });

  test('supports child ron 2han 100fu', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 2,
      fu: 100,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 6400, additional: 0 });
  });

  test('supports dealer ron 1han 80fu', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 1,
      fu: 80,
      isWinnerDealer: true,
    });

    expect(result).toEqual({ main: 3900, additional: 0 });
  });

  test('supports child tsumo 2han 80fu', () => {
    const result = calculateScoreCost({
      isTsumo: true,
      han: 2,
      fu: 80,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 2600, additional: 1300 });
  });

  test('supports dealer tsumo 2han 100fu', () => {
    const result = calculateScoreCost({
      isTsumo: true,
      han: 2,
      fu: 100,
      isWinnerDealer: true,
    });

    expect(result).toEqual({ main: 3200, additional: 3200 });
  });

  test('caps at mangan for 3han 70fu', () => {
    const result = calculateScoreCost({
      isTsumo: false,
      han: 3,
      fu: 70,
      isWinnerDealer: false,
    });

    expect(result).toEqual({ main: 8000, additional: 0 });
  });

  test('caps at mangan for 4han 50fu ron', () => {
    const childResult = calculateScoreCost({
      isTsumo: false,
      han: 4,
      fu: 50,
      isWinnerDealer: false,
    });
    const dealerResult = calculateScoreCost({
      isTsumo: false,
      han: 4,
      fu: 50,
      isWinnerDealer: true,
    });

    expect(childResult).toEqual({ main: 8000, additional: 0 });
    expect(dealerResult).toEqual({ main: 12000, additional: 0 });
  });

  test('caps at mangan for 4han 50fu tsumo', () => {
    const childResult = calculateScoreCost({
      isTsumo: true,
      han: 4,
      fu: 50,
      isWinnerDealer: false,
    });
    const dealerResult = calculateScoreCost({
      isTsumo: true,
      han: 4,
      fu: 50,
      isWinnerDealer: true,
    });

    expect(childResult).toEqual({ main: 4000, additional: 2000 });
    expect(dealerResult).toEqual({ main: 4000, additional: 4000 });
  });

  test('covers all non-limit table combinations (child/dealer, ron/tsumo)', () => {
    Object.entries(CHILD_RON_TABLE).forEach(([hanStr, fuMap]) => {
      const han = Number(hanStr);
      Object.entries(fuMap).forEach(([fuStr, childRon]) => {
        const fu = Number(fuStr);
        const childTsumo = CHILD_TSUMO_TABLE[han][fu];

        expect(
          calculateScoreCost({
            isTsumo: false,
            han,
            fu,
            isWinnerDealer: false,
          })
        ).toEqual({ main: childRon, additional: 0 });

        expect(
          calculateScoreCost({
            isTsumo: false,
            han,
            fu,
            isWinnerDealer: true,
          })
        ).toEqual({ main: Math.ceil((childRon * 1.5) / 100) * 100, additional: 0 });

        expect(
          calculateScoreCost({
            isTsumo: true,
            han,
            fu,
            isWinnerDealer: false,
          })
        ).toEqual({ main: childTsumo[0], additional: childTsumo[1] });

        expect(
          calculateScoreCost({
            isTsumo: true,
            han,
            fu,
            isWinnerDealer: true,
          })
        ).toEqual({ main: childTsumo[0], additional: childTsumo[0] });
      });
    });
  });

  test('covers all limit hand ranges for child/dealer and ron/tsumo', () => {
    Object.entries(LIMIT_HAND_CHILD_RON).forEach(([hanStr, childRon]) => {
      const han = Number(hanStr);
      const childTsumo = LIMIT_HAND_CHILD_TSUMO[han];

      expect(
        calculateScoreCost({
          isTsumo: false,
          han,
          fu: 30,
          isWinnerDealer: false,
        })
      ).toEqual({ main: childRon, additional: 0 });

      expect(
        calculateScoreCost({
          isTsumo: false,
          han,
          fu: 110,
          isWinnerDealer: true,
        })
      ).toEqual({ main: Math.ceil((childRon * 1.5) / 100) * 100, additional: 0 });

      expect(
        calculateScoreCost({
          isTsumo: true,
          han,
          fu: 30,
          isWinnerDealer: false,
        })
      ).toEqual({ main: childTsumo[0], additional: childTsumo[1] });

      expect(
        calculateScoreCost({
          isTsumo: true,
          han,
          fu: 110,
          isWinnerDealer: true,
        })
      ).toEqual({ main: childTsumo[0], additional: childTsumo[0] });
    });
  });
});
