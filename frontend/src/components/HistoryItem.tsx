import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { HistoryEntry, Player, Wind } from '../types/mahjong';

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

interface Props {
  item: HistoryEntry;
  index: number;
  players: Player[];
}

export function HistoryItem({ item, index, players }: Props) {
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
  }, [fadeAnim, index, slideAnim]);

  const getRoundLabel = () => {
    const windLabel = item.round.roundWind === 'east' ? '東' : '南';
    const roundNum = ((item.round.round - 1) % 4) + 1;
    return `${windLabel}${roundNum}局`;
  };

  const getResultText = () => {
    const { result } = item;
    switch (result.type) {
      case 'ron':
        return `ロン: ${players[result.winnerIndex!]?.name} ← ${players[result.loserIndex!]?.name}`;
      case 'tsumo':
        return `ツモ: ${players[result.winnerIndex!]?.name}`;
      case 'draw':
        return '流局';
      case 'riichi':
        return `リーチ: ${players[result.riichiPlayerIndex!]?.name}`;
      default:
        return '';
    }
  };

  const getMeldSummaryText = () => {
    const melds = item.result.melds;
    if (!melds || melds.length === 0) return null;
    const parts = melds.map((m) => {
      const typeLabel =
        m.type === 'chi' ? 'チー' : m.type === 'pon' ? 'ポン' : m.type === 'kan' ? '明槓' : '暗槓';
      if (m.type === 'ankan') return typeLabel;
      const fromLabel = m.from === 'kamicha' ? '上家' : m.from === 'toimen' ? '対面' : '下家';
      return `${typeLabel}(${fromLabel})`;
    });
    return `副露: ${parts.join(' / ')}`;
  };

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
        <Text style={styles.roundLabel}>{getRoundLabel()}</Text>
        {item.round.honba > 0 && <Text style={styles.honbaLabel}>{item.round.honba}本場</Text>}
      </View>

      <Text style={styles.resultText}>{getResultText()}</Text>

      {item.result.scoreResult && (
        <Text style={styles.scoreInfo}>
          {item.result.scoreResult.han}翻 {item.result.scoreResult.fu}符 /{' '}
          {item.result.scoreResult.cost.total || item.result.scoreResult.cost.main}点
        </Text>
      )}

      {getMeldSummaryText() && <Text style={styles.meldInfo}>{getMeldSummaryText()}</Text>}

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
              {diff > 0 ? '+' : ''}
              {diff.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  meldInfo: {
    fontSize: 13,
    color: '#f1c40f',
    marginBottom: 8,
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
});
