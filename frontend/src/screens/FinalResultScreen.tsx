import React, { useMemo, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { useGameStore } from '../store/gameStore';

interface Props {
  onStartNewGame: () => void;
}

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const formatDate = (ts: number | null): string => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
};

const formatTime = (ts: number | null): string => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const formatDuration = (start: number | null, end: number | null): string => {
  if (!start) return '-';
  const targetEnd = end ?? Date.now();
  const totalSec = Math.max(0, Math.floor((targetEnd - start) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
};

export function FinalResultScreen({ onStartNewGame }: Props) {
  const { players, endReason, startedAt, endedAt, resetGame } = useGameStore();
  const viewShotRef = useRef<ViewShot | null>(null);

  const ranking = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  const handleCapture = async () => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('権限エラー', '画像保存のため写真ライブラリ権限を許可してください。');
        return;
      }

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert('保存失敗', 'スクリーンショットを取得できませんでした。');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('保存完了', '最終結果を画像として保存しました。');
    } catch {
      Alert.alert('保存失敗', '画像保存中にエラーが発生しました。');
    }
  };

  const handleReset = () => {
    resetGame();
    onStartNewGame();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.captureArea}>
        <Text style={styles.title}>最終結果</Text>
        <Text style={styles.subTitle}>{endReason || '対局終了'}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>対局情報</Text>
          <Text style={styles.infoLine}>日付: {formatDate(startedAt)}</Text>
          <Text style={styles.infoLine}>開始: {formatTime(startedAt)}</Text>
          <Text style={styles.infoLine}>終了: {formatTime(endedAt)}</Text>
          <Text style={styles.infoLine}>経過: {formatDuration(startedAt, endedAt)}</Text>
        </View>

        <View style={styles.rankCard}>
          <Text style={styles.infoTitle}>順位</Text>
          {ranking.map((player, idx) => (
            <View key={`${player.name}-${idx}`} style={styles.rankRow}>
              <Text style={styles.rankLabel}>{idx + 1}位</Text>
              <Text style={styles.rankName}>{player.name}</Text>
              <Text style={styles.rankScore}>{player.score.toLocaleString()} 点</Text>
            </View>
          ))}
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.captureButton} onPress={handleCapture} activeOpacity={0.8}>
        <Text style={styles.captureButtonText}>スクリーンショットを保存</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.newGameButton} onPress={handleReset} activeOpacity={0.8}>
        <Text style={styles.newGameButtonText}>新しいゲームを開始</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  captureArea: {
    backgroundColor: '#23233a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    color: '#f39c12',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  rankCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  infoLine: {
    fontSize: 14,
    color: '#d3d3e5',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankLabel: {
    width: 42,
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '700',
  },
  rankName: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  rankScore: {
    fontSize: 15,
    color: '#8fd3ff',
    fontWeight: '700',
  },
  captureButton: {
    backgroundColor: '#2980b9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  newGameButton: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  newGameButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
