import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { calculateScore } from '../api/client';
import type { Wind, TileInput, ScoreResult } from '../types/mahjong';

interface Props {
  onBack: () => void;
}

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

// シンプルな点数直接入力モード用
const SCORE_PRESETS = {
  ron: {
    1: { 30: 1000, 40: 1300, 50: 1600 },
    2: { 25: 1600, 30: 2000, 40: 2600, 50: 3200 },
    3: { 25: 3200, 30: 3900, 40: 5200, 50: 6400 },
    4: { 25: 6400, 30: 7700, 40: 8000 },
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
    // [親払い, 子払い]
    1: { 30: [500, 300], 40: [700, 400], 50: [800, 400] },
    2: { 25: [800, 400], 30: [1000, 500], 40: [1300, 700], 50: [1600, 800] },
    3: { 25: [1600, 800], 30: [2000, 1000], 40: [2600, 1300], 50: [3200, 1600] },
    4: { 25: [3200, 1600], 30: [3900, 2000], 40: [4000, 2000] },
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

export function RecordWinScreen({ onBack }: Props) {
  const { players, round, applyRon, applyTsumo, advanceRound } = useGameStore();

  const [isTsumo, setIsTsumo] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [loserIndex, setLoserIndex] = useState<number | null>(null);
  const [han, setHan] = useState<number>(1);
  const [fu, setFu] = useState<number>(30);
  const [isRiichi, setIsRiichi] = useState(false);

  const previewScale = useRef(new Animated.Value(1)).current;
  const previewOpacity = useRef(new Animated.Value(1)).current;

  const isWinnerDealer = winnerIndex === round.dealerIndex;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(previewScale, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(previewOpacity, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(previewScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(previewOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [han, fu, winnerIndex, isTsumo]);

  const getScore = (): { main: number; additional: number } | null => {
    const scoreTable = isTsumo ? SCORE_PRESETS.tsumo : SCORE_PRESETS.ron;
    const hanScores = scoreTable[han];
    if (!hanScores) return null;

    // 満貫以上は符関係なし
    const effectiveFu = han >= 5 ? 0 : fu;
    const score = hanScores[effectiveFu];
    if (!score) return null;

    if (isTsumo) {
      const [dealerPay, nonDealerPay] = score as [number, number];
      if (isWinnerDealer) {
        // 親のツモ
        return { main: dealerPay, additional: dealerPay };
      } else {
        // 子のツモ
        return { main: dealerPay, additional: nonDealerPay };
      }
    } else {
      const ronScore = score as number;
      // 親は1.5倍
      const finalScore = isWinnerDealer ? Math.ceil(ronScore * 1.5 / 100) * 100 : ronScore;
      return { main: finalScore, additional: 0 };
    }
  };

  const handleConfirm = async () => {
    if (winnerIndex === null) {
      Alert.alert('エラー', '和了者を選択してください');
      return;
    }
    if (!isTsumo && loserIndex === null) {
      Alert.alert('エラー', '放銃者を選択してください');
      return;
    }

    const cost = getScore();
    if (!cost) {
      Alert.alert('エラー', '点数を計算できません');
      return;
    }

    const scoreResult: ScoreResult = {
      han,
      fu,
      cost: { ...cost, total: isTsumo ? cost.main + cost.additional * 2 : cost.main },
      yaku: [],
    };

    if (isTsumo) {
      applyTsumo(winnerIndex, scoreResult);
    } else {
      applyRon(winnerIndex, loserIndex!, scoreResult);
    }

    // 局を進める
    advanceRound(winnerIndex === round.dealerIndex);

    onBack();
  };

  const scoreInfo = getScore();
  const displayScore = scoreInfo
    ? isTsumo
      ? isWinnerDealer
        ? `${scoreInfo.main}オール`
        : `${scoreInfo.main}/${scoreInfo.additional}`
      : `${scoreInfo.main}点`
    : '---';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>和了入力</Text>

      {/* ロン/ツモ選択 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>和了タイプ</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, !isTsumo && styles.toggleActive]}
            onPress={() => setIsTsumo(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, !isTsumo && styles.toggleTextActive]}>
              ロン
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isTsumo && styles.toggleActive]}
            onPress={() => setIsTsumo(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, isTsumo && styles.toggleTextActive]}>
              ツモ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 和了者選択 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>和了者</Text>
        <View style={styles.playerGrid}>
          {players.map((player, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.playerButton,
                winnerIndex === index && styles.playerButtonActive,
              ]}
              onPress={() => {
                setWinnerIndex(index);
                if (loserIndex === index) setLoserIndex(null);
              }}
            >
              <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
              <Text style={styles.playerName}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 放銃者選択（ロンの場合のみ） */}
      {!isTsumo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>放銃者</Text>
          <View style={styles.playerGrid}>
            {players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.playerButton,
                  loserIndex === index && styles.playerButtonLoser,
                  winnerIndex === index && styles.playerButtonDisabled,
                ]}
                onPress={() => winnerIndex !== index && setLoserIndex(index)}
                disabled={winnerIndex === index}
              >
                <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 翻/符選択 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>翻数</Text>
        <View style={styles.hanRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.hanButton, han === h && styles.hanButtonActive]}
              onPress={() => setHan(h)}
            >
              <Text style={[styles.hanText, han === h && styles.hanTextActive]}>
                {h}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {han < 5 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>符</Text>
          <View style={styles.fuRow}>
            {[20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.fuButton, fu === f && styles.fuButtonActive]}
                onPress={() => setFu(f)}
              >
                <Text style={[styles.fuText, fu === f && styles.fuTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* リーチ */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.riichiButton, isRiichi && styles.riichiButtonActive]}
          onPress={() => setIsRiichi(!isRiichi)}
        >
          <Text style={[styles.riichiText, isRiichi && styles.riichiTextActive]}>
            リーチ
          </Text>
        </TouchableOpacity>
      </View>

      {/* 点数プレビュー */}
      <Animated.View
        style={[
          styles.previewSection,
          {
            transform: [{ scale: previewScale }],
            opacity: previewOpacity,
          },
        ]}
      >
        <Text style={styles.previewLabel}>点数</Text>
        <Text style={styles.previewScore}>{displayScore}</Text>
        {han >= 5 && (
          <Text style={styles.previewYakuman}>
            {han === 5 ? '満貫' :
             han <= 7 ? '跳満' :
             han <= 10 ? '倍満' :
             han <= 12 ? '三倍満' : '役満'}
          </Text>
        )}
      </Animated.View>

      {/* アクション */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.7}>
          <Text style={styles.confirmButtonText}>確定</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 18,
    color: '#aaa',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  playerButtonActive: {
    backgroundColor: '#4CAF50',
  },
  playerButtonLoser: {
    backgroundColor: '#c0392b',
  },
  playerButtonDisabled: {
    opacity: 0.3,
  },
  playerWind: {
    fontSize: 16,
    color: '#FFD700',
  },
  playerName: {
    fontSize: 14,
    color: '#fff',
  },
  hanRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hanButtonActive: {
    backgroundColor: '#3498db',
  },
  hanText: {
    fontSize: 16,
    color: '#aaa',
  },
  hanTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2d2d44',
  },
  fuButtonActive: {
    backgroundColor: '#9b59b6',
  },
  fuText: {
    fontSize: 14,
    color: '#aaa',
  },
  fuTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  riichiButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  riichiButtonActive: {
    backgroundColor: '#e74c3c',
  },
  riichiText: {
    fontSize: 16,
    color: '#aaa',
  },
  riichiTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewSection: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  previewScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  previewYakuman: {
    fontSize: 18,
    color: '#e74c3c',
    marginTop: 4,
  },
  actions: {
    gap: 12,
    paddingBottom: 40,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
