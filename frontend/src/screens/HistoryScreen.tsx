import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { useGameStore } from '../store/gameStore';
import type { HistoryEntry, Wind } from '../types/mahjong';

interface Props {
  onBack: () => void;
}

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

export function HistoryScreen({ onBack }: Props) {
  const { history, players } = useGameStore();

  const getRoundLabel = (entry: HistoryEntry) => {
    const windLabel = entry.round.roundWind === 'east' ? '東' : '南';
    const roundNum = ((entry.round.round - 1) % 4) + 1;
    return `${windLabel}${roundNum}局`;
  };

  const getResultText = (entry: HistoryEntry) => {
    const { result } = entry;
    switch (result.type) {
      case 'ron':
        return `ロン: ${players[result.winnerIndex!]?.name} ← ${players[result.loserIndex!]?.name}`;
      case 'tsumo':
        return `ツモ: ${players[result.winnerIndex!]?.name}`;
      case 'draw':
        return '流局';
      default:
        return '';
    }
  };

  const renderItem = ({ item, index }: { item: HistoryEntry; index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.historyItem,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.historyHeader}>
          <Text style={styles.roundLabel}>{getRoundLabel(item)}</Text>
          {item.round.honba > 0 && (
            <Text style={styles.honbaLabel}>{item.round.honba}本場</Text>
          )}
        </View>

        <Text style={styles.resultText}>{getResultText(item)}</Text>

        {item.result.scoreResult && (
          <Text style={styles.scoreInfo}>
            {item.result.scoreResult.han}翻 {item.result.scoreResult.fu}符 /{' '}
            {item.result.scoreResult.cost.total || item.result.scoreResult.cost.main}点
          </Text>
        )}

        <View style={styles.scoreDiffs}>
          {item.result.scoreDiffs.map((diff, i) => (
            <View key={i} style={styles.diffItem}>
              <Text style={styles.diffWind}>{WIND_LABELS[players[i]?.wind || 'east']}</Text>
              <Text
                style={[
                  styles.diffValue,
                  diff > 0 && styles.diffPositive,
                  diff < 0 && styles.diffNegative,
                ]}
              >
                {diff > 0 ? '+' : ''}{diff.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>対局履歴</Text>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>まだ履歴がありません</Text>
        </View>
      ) : (
        <FlatList
          data={[...history].reverse()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    padding: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  historyItem: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roundLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  honbaLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  resultText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  scoreInfo: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 12,
  },
  scoreDiffs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 8,
  },
  diffItem: {
    alignItems: 'center',
  },
  diffWind: {
    fontSize: 12,
    color: '#aaa',
  },
  diffValue: {
    fontSize: 14,
    color: '#fff',
  },
  diffPositive: {
    color: '#4CAF50',
  },
  diffNegative: {
    color: '#e74c3c',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#444',
    padding: 14,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
