import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, AlertButton } from 'react-native';
import { useGameStore } from '../store/gameStore';
import type { Wind } from '../types/mahjong';

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

interface Props {
  onStartGame: () => void;
  onRecordWin: () => void;
  onShowHistory: () => void;
  onRecognition: () => void;
  onManualInput: () => void;
}

export function ScoreboardScreen({ onStartGame, onRecordWin, onShowHistory, onRecognition, onManualInput }: Props) {
  const {
    players,
    round,
    isGameStarted,
    isGameEnded,
    endReason,
    resetGame,
    undoLastAction,
    history,
    addRiichiStick,
  } = useGameStore();
  const fadeAnims = useRef(players.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(players.map(() => new Animated.Value(30))).current;
  const dealerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isGameStarted) {
      const animations = players.map((_, index) =>
        Animated.parallel([
          Animated.timing(fadeAnims[index], {
            toValue: 1,
            duration: 300,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnims[index], {
            toValue: 0,
            duration: 300,
            delay: index * 100,
            useNativeDriver: true,
          }),
        ])
      );
      Animated.stagger(50, animations).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(dealerPulse, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(dealerPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    }
  }, [isGameStarted, players.length]);

  const getRoundLabel = () => {
    const windLabel = round.roundWind === 'east' ? '東' : '南';
    const roundNum = ((round.round - 1) % 4) + 1;
    return `${windLabel}${roundNum}局`;
  };

  const handleDeclareRiichi = () => {
    const buttons: AlertButton[] = players.map((player, index) => ({
      text: `${WIND_LABELS[player.wind]} ${player.name} (${player.score.toLocaleString()})`,
      onPress: () => {
        const ok = addRiichiStick(index);
        if (!ok) {
          Alert.alert('リーチ不可', '持ち点が1000点未満のため、リーチできません。');
        }
      },
    }));

    buttons.push({ text: 'キャンセル', style: 'cancel' as const });
    Alert.alert('リーチ宣言', '宣言者を選択してください', buttons);
  };

  if (!isGameStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.startContainer}>
          <Text style={styles.title}>麻雀点数計算</Text>
          <TouchableOpacity style={styles.startButton} onPress={onStartGame} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>ゲーム開始</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 局情報 */}
      <View style={styles.roundInfo}>
        <Text style={styles.roundText}>{getRoundLabel()}</Text>
        <View style={styles.roundDetails}>
          <Text style={styles.detailText}>本場: {round.honba}</Text>
          <Text style={styles.detailText}>供託: {round.riichiSticks}</Text>
        </View>
        {isGameEnded && (
          <Text style={styles.endLabel}>終局: {endReason || '対局終了'}</Text>
        )}
      </View>

      {/* スコアボード */}
      <View style={styles.scoreBoard}>
        {players.map((player, index) => (
          <Animated.View
            key={index}
            style={[
              styles.playerCard,
              index === round.dealerIndex && styles.dealerCard,
              {
                opacity: fadeAnims[index],
                transform: [
                  { translateY: slideAnims[index] },
                  index === round.dealerIndex ? { scale: dealerPulse } : { scale: 1 }
                ],
              },
            ]}
          >
            <View style={styles.playerHeader}>
              <Text style={styles.windLabel}>{WIND_LABELS[player.wind]}</Text>
              {index === round.dealerIndex && (
                <Text style={styles.dealerLabel}>親</Text>
              )}
            </View>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerScore}>
              {player.score.toLocaleString()}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, isGameEnded && styles.disabledButton]}
            onPress={onRecordWin}
            disabled={isGameEnded}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>和了を記録</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.recognitionButton, isGameEnded && styles.disabledButton]}
            onPress={onRecognition}
            disabled={isGameEnded}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>画像で入力</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.manualInputButton, isGameEnded && styles.disabledButton]}
            onPress={onManualInput}
            disabled={isGameEnded}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>手入力</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, !history.length && styles.disabledButton]}
            onPress={undoLastAction}
            disabled={!history.length}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>取り消し</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onShowHistory} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>履歴</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.riichiButton, isGameEnded && styles.disabledButton]}
          onPress={handleDeclareRiichi}
          disabled={isGameEnded}
          activeOpacity={0.7}
        >
          <Text style={styles.riichiButtonText}>リーチ宣言</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetGame} activeOpacity={0.7}>
          <Text style={styles.resetButtonText}>ゲーム終了</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roundInfo: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  roundText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  roundDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#aaa',
  },
  endLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
  },
  scoreBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  playerCard: {
    width: '48%',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dealerCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  windLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  dealerLabel: {
    fontSize: 12,
    color: '#FFD700',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playerName: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 4,
  },
  playerScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  recognitionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualInputButton: {
    flex: 1,
    backgroundColor: '#16a085',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  resetButton: {
    backgroundColor: '#c0392b',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  riichiButton: {
    backgroundColor: '#8e44ad',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  riichiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
