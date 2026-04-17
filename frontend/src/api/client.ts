import type { CalculateRequest, ScoreResult, RecognitionResult } from '../types/mahjong';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const IOS_SIMULATOR_HOST = '127.0.0.1';
const TUNNEL_HOST_PATTERNS = [/\.exp\.direct$/i, /\.expo\.dev$/i, /\.exp\.host$/i, /\.ngrok(?:-free)?\.app$/i];

function buildApiBaseUrl(host: string): string {
  return `http://${host}:${API_PORT}`;
}

function extractHost(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    if (candidate.includes('://')) {
      return new URL(candidate).hostname || null;
    }
  } catch {
    return null;
  }

  const [host] = candidate.split(':');
  return host || null;
}

function isTunnelHost(host: string): boolean {
  return TUNNEL_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function normalizeHostForPlatform(host: string): string {
  if ((host === 'localhost' || host === '127.0.0.1') && Platform.OS === 'android') {
    return ANDROID_EMULATOR_HOST;
  }

  if (host === 'localhost' && Platform.OS === 'ios') {
    return IOS_SIMULATOR_HOST;
  }

  return host;
}

function inferApiBaseUrlFromBundleHost(): string | null {
  const constantHostCandidates: Array<string | undefined> = [
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost,
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of constantHostCandidates) {
    const host = extractHost(candidate);
    if (host && !isTunnelHost(host)) {
      return buildApiBaseUrl(normalizeHostForPlatform(host));
    }
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  const host = extractHost(scriptURL);
  if (!host || isTunnelHost(host)) {
    return null;
  }

  return buildApiBaseUrl(normalizeHostForPlatform(host));
}

const API_AUTH_TOKEN = process.env.EXPO_PUBLIC_API_AUTH_TOKEN;

function getPlatformLocalFallbackUrl(): string {
  return buildApiBaseUrl(Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : IOS_SIMULATOR_HOST);
}

export function resolveApiBaseUrl(): string {
  const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl;
  }

  return inferApiBaseUrlFromBundleHost() || getPlatformLocalFallbackUrl();
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
