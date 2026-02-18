import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { HistoryItem } from '../components/HistoryItem';

interface Props {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: Props) {
  const { history, players } = useGameStore();

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
          renderItem={({ item, index }) => <HistoryItem item={item} index={index} players={players} />}
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
