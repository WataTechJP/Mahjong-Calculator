import type { CalculateRequest, ScoreResult, RecognitionResult } from '../types/mahjong';

// 開発環境では localhost、実機では適切なIPに変更
const API_BASE_URL = 'http://localhost:8000';

export async function calculateScore(request: CalculateRequest): Promise<ScoreResult> {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function recognizeTiles(imageUri: string): Promise<RecognitionResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'tiles.jpg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/recognize`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function applyScoreToPlayers(params: {
  scores: number[];
  winnerIndex: number;
  loserIndex?: number;
  cost: { main: number; additional: number };
  isTsumo: boolean;
  honba: number;
  riichiSticks: number;
}): Promise<{
  scores: number[];
  diff: number[];
}> {
  const response = await fetch(`${API_BASE_URL}/apply-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scores: params.scores,
      winner_index: params.winnerIndex,
      loser_index: params.loserIndex,
      cost: params.cost,
      is_tsumo: params.isTsumo,
      honba: params.honba,
      riichi_sticks: params.riichiSticks,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
