import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
}

export function ScoreboardScreen({ onStartGame, onRecordWin, onShowHistory }: Props) {
  const { players, round, isGameStarted, resetGame, undoLastAction, history } = useGameStore();

  const getRoundLabel = () => {
    const windLabel = round.roundWind === 'east' ? '東' : '南';
    const roundNum = ((round.round - 1) % 4) + 1;
    return `${windLabel}${roundNum}局`;
  };

  if (!isGameStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.startContainer}>
          <Text style={styles.title}>麻雀点数計算</Text>
          <TouchableOpacity style={styles.startButton} onPress={onStartGame}>
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
      </View>

      {/* スコアボード */}
      <View style={styles.scoreBoard}>
        {players.map((player, index) => (
          <View
            key={index}
            style={[
              styles.playerCard,
              index === round.dealerIndex && styles.dealerCard,
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
          </View>
        ))}
      </View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onRecordWin}>
          <Text style={styles.actionButtonText}>和了を記録</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, !history.length && styles.disabledButton]}
            onPress={undoLastAction}
            disabled={!history.length}
          >
            <Text style={styles.secondaryButtonText}>取り消し</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onShowHistory}>
            <Text style={styles.secondaryButtonText}>履歴</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
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
    backgroundColor: '#4CAF50',
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
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
