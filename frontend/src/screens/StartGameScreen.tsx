import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';

interface Props {
  onBack: () => void;
}

export function StartGameScreen({ onBack }: Props) {
  const [names, setNames] = useState(['', '', '', '']);
  const { startGame } = useGameStore();

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const handleStart = () => {
    startGame(names);
    onBack();
  };

  const windLabels = ['東家', '南家', '西家', '北家'];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>プレイヤー設定</Text>

      {names.map((name, index) => (
        <View key={index} style={styles.inputRow}>
          <Text style={styles.windLabel}>{windLabels[index]}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(value) => handleNameChange(index, value)}
            placeholder={`プレイヤー${index + 1}`}
            placeholderTextColor="#666"
          />
        </View>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>ゲーム開始</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  windLabel: {
    fontSize: 18,
    color: '#FFD700',
    width: 60,
  },
  input: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  actions: {
    marginTop: 30,
    gap: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
