import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import type { Wind, ScoreResult } from '../types/mahjong';
import { calculateScoreCost } from '../utils/scoreCalculator';

interface Props {
  onBack: () => void;
}

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

const SCORE_NOTICES = ['点数は一般的な麻雀点数早見表を参考にしています。'];

export function RecordWinScreen({ onBack }: Props) {
  const { players, round, applyRon, applyTsumo, advanceRound } = useGameStore();

  const [isTsumo, setIsTsumo] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [loserIndex, setLoserIndex] = useState<number | null>(null);
  const [han, setHan] = useState<number>(1);
  const [fu, setFu] = useState<number>(30);
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);

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

  const handleConfirm = async () => {
    if (winnerIndex === null) {
      Alert.alert('エラー', '和了者を選択してください');
      return;
    }
    if (!isTsumo && loserIndex === null) {
      Alert.alert('エラー', '放銃者を選択してください');
      return;
    }

    const cost = calculateScoreCost({
      isTsumo,
      han,
      fu,
      isWinnerDealer,
    });
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

    try {
      if (isTsumo) {
        await applyTsumo(winnerIndex, scoreResult);
      } else {
        await applyRon(winnerIndex, loserIndex!, scoreResult);
      }
    } catch {
      Alert.alert('エラー', '点数適用に失敗しました。サーバー接続を確認してください。');
      return;
    }

    // 局を進める
    advanceRound(winnerIndex === round.dealerIndex);

    onBack();
  };

  const scoreInfo = calculateScoreCost({
    isTsumo,
    han,
    fu,
    isWinnerDealer,
  });
  const isSpecialTwoHanTwentyFiveFu = han === 2 && fu === 25;
  const specialTwoHanTwentyFiveFuLabel = isSpecialTwoHanTwentyFiveFu
    ? isWinnerDealer
      ? '800オール'
      : '800/800'
    : null;
  const dealerTsumoInfo = isWinnerDealer
    ? calculateScoreCost({
        isTsumo: true,
        han,
        fu,
        isWinnerDealer: true,
      })
    : null;
  const displayScore = scoreInfo
    ? isTsumo
      ? isSpecialTwoHanTwentyFiveFu
        ? `${scoreInfo.main + scoreInfo.additional * 2}点`
        : isWinnerDealer
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
            <Text style={[styles.toggleText, !isTsumo && styles.toggleTextActive]}>ロン</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isTsumo && styles.toggleActive]}
            onPress={() => setIsTsumo(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, isTsumo && styles.toggleTextActive]}>ツモ</Text>
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
              style={[styles.playerButton, winnerIndex === index && styles.playerButtonActive]}
              onPress={() => {
                setWinnerIndex(index);
                if (loserIndex === index) setLoserIndex(null);
              }}
            >
              <View style={styles.playerWindRow}>
                <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
                {index === round.dealerIndex && <Text style={styles.playerDealerLabel}>親</Text>}
              </View>
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
                <View style={styles.playerWindRow}>
                  <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
                  {index === round.dealerIndex && <Text style={styles.playerDealerLabel}>親</Text>}
                </View>
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
              <Text style={[styles.hanText, han === h && styles.hanTextActive]}>{h}</Text>
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
                <Text style={[styles.fuText, fu === f && styles.fuTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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
        {specialTwoHanTwentyFiveFuLabel ? (
          <Text style={styles.previewDealerAll}>{specialTwoHanTwentyFiveFuLabel}</Text>
        ) : (
          dealerTsumoInfo && (
            <Text style={styles.previewDealerAll}>{dealerTsumoInfo.main}オール</Text>
          )
        )}
        {han >= 5 && (
          <Text style={styles.previewYakuman}>
            {han === 5
              ? '満貫'
              : han <= 7
                ? '跳満'
                : han <= 10
                  ? '倍満'
                  : han <= 12
                    ? '三倍満'
                    : '役満'}
          </Text>
        )}
        <Text style={styles.previewNotice}>※点数は一般的な麻雀点数早見表を参考にしています</Text>
        <TouchableOpacity
          style={styles.noticeButton}
          onPress={() => setIsNoticeModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.noticeButtonText}>注意事項をこちら</Text>
        </TouchableOpacity>
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

      <Modal
        visible={isNoticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNoticeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>注意事項</Text>
            {SCORE_NOTICES.map((notice, index) => (
              <Text key={index} style={styles.modalNoticeItem}>
                ※{notice}
              </Text>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsNoticeModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  playerWindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 14,
    color: '#fff',
  },
  playerDealerLabel: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '700',
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
    width: 50,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
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
  previewDealerAll: {
    marginTop: 2,
    fontSize: 14,
    color: '#9ec5ff',
  },
  previewYakuman: {
    fontSize: 18,
    color: '#e74c3c',
    marginTop: 4,
  },
  previewNotice: {
    marginTop: 10,
    fontSize: 12,
    color: '#b9c0d0',
    textAlign: 'center',
  },
  noticeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6a7192',
  },
  noticeButtonText: {
    fontSize: 12,
    color: '#d8ddf0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 40,
  },
  confirmButton: {
    flex: 1,
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
    flex: 1,
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#23233a',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalNoticeItem: {
    fontSize: 14,
    color: '#d8ddf0',
    lineHeight: 21,
    marginBottom: 8,
  },
  modalCloseButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
