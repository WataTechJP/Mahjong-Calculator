import type { CalculateRequest, ScoreResult, RecognitionResult } from '../types/mahjong';
import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

function inferApiBaseUrlFromBundleHost(): string | null {
  const constantHostCandidates: Array<string | undefined> = [
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost,
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of constantHostCandidates) {
    if (!candidate) continue;
    const host = candidate.split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const match = scriptURL.match(/^(?:https?|exp):\/\/([^/:]+)(?::\d+)?\//);
  if (!match?.[1]) return null;

  return `http://${match[1]}:8000`;
}

const API_AUTH_TOKEN = process.env.EXPO_PUBLIC_API_AUTH_TOKEN;

function resolveApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL || inferApiBaseUrlFromBundleHost() || 'http://localhost:8000';
}

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
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/calculate`, {
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
  const apiBaseUrl = resolveApiBaseUrl();
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'tiles.jpg',
  } as any);

  const response = await fetch(`${apiBaseUrl}/recognize`, {
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
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/apply-score`, {
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
