import type { CalculateRequest, ScoreResult, RecognitionResult } from '../types/mahjong';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_AUTH_TOKEN = process.env.EXPO_PUBLIC_API_AUTH_TOKEN;

function getHeaders(contentType: 'json' | 'none' = 'json'): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType === 'json') {
    headers['Content-Type'] = 'application/json';
  }
  if (API_AUTH_TOKEN) {
    headers['x-api-key'] = API_AUTH_TOKEN;
  }
  return headers;
}

export async function calculateScore(request: CalculateRequest): Promise<ScoreResult> {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: 'POST',
    headers: getHeaders('json'),
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
    headers: getHeaders('none'),
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
  dealerIndex: number;
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
    headers: getHeaders('json'),
    body: JSON.stringify({
      scores: params.scores,
      winner_index: params.winnerIndex,
      loser_index: params.loserIndex,
      dealer_index: params.dealerIndex,
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
