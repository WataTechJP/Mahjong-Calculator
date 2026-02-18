import { calculateScoreCost } from './scoreCalculator';

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
});
