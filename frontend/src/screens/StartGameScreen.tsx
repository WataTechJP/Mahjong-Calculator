import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../types/mahjong';

interface Props {
  onBack: () => void;
}

export function StartGameScreen({ onBack }: Props) {
  const [names, setNames] = useState(['', '', '', '']);
  const [gameMode, setGameMode] = useState<GameMode>('hanchan');
  const [enable30000Rule] = useState(false);
  const { startGame } = useGameStore();
  const borderAnimations = useRef(names.map(() => new Animated.Value(0))).current;

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const handleFocus = (index: number) => {
    Animated.timing(borderAnimations[index], {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = (index: number) => {
    Animated.timing(borderAnimations[index], {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleStart = () => {
    startGame(names, { gameMode, enable30000Rule });
    onBack();
  };

  const windLabels = ['東家', '南家', '西家', '北家'];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>プレイヤー設定</Text>

      {names.map((name, index) => {
        const borderColor = borderAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: ['#2d2d44', '#4CAF50'],
        });

        return (
          <View key={index} style={styles.inputRow}>
            <Text style={styles.windLabel}>{windLabels[index]}</Text>
            <Animated.View style={[styles.inputContainer, { borderColor }]}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(value) => handleNameChange(index, value)}
                onFocus={() => handleFocus(index)}
                onBlur={() => handleBlur(index)}
                placeholder={`プレイヤー${index + 1}`}
                placeholderTextColor="#666"
              />
            </Animated.View>
          </View>
        );
      })}

      <View style={styles.ruleSection}>
        <Text style={styles.ruleTitle}>対局モード</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeButton, gameMode === 'tonpu' && styles.modeButtonActive]}
            onPress={() => setGameMode('tonpu')}
          >
            <Text style={[styles.modeText, gameMode === 'tonpu' && styles.modeTextActive]}>
              東風戦
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, gameMode === 'hanchan' && styles.modeButtonActive]}
            onPress={() => setGameMode('hanchan')}
          >
            <Text style={[styles.modeText, gameMode === 'hanchan' && styles.modeTextActive]}>
              半荘
            </Text>
          </TouchableOpacity>
        </View>

        {/* <TouchableOpacity
          style={[
            styles.ruleToggle,
            enable30000Rule && styles.ruleToggleActive,
          ]}
          onPress={() => setEnable30000Rule((prev) => !prev)}
        >
          <Text
            style={[
              styles.ruleToggleText,
              enable30000Rule && styles.ruleToggleTextActive,
            ]}
          >
            30000点終了条件
          </Text>
          <Text style={styles.ruleSubText}>
            東4終了時トップ30000点未満なら南場へ
          </Text>
        </TouchableOpacity> */}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.7}>
          <Text style={styles.startButtonText}>ゲーム開始</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
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
  inputContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  input: {
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
  ruleSection: {
    marginTop: 20,
    gap: 10,
  },
  ruleTitle: {
    fontSize: 16,
    color: '#aaa',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#3498db',
  },
  modeText: {
    color: '#aaa',
    fontSize: 16,
  },
  modeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  ruleToggle: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  ruleToggleActive: {
    backgroundColor: '#8e44ad',
  },
  ruleToggleText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  ruleToggleTextActive: {
    color: '#fff',
  },
  ruleSubText: {
    color: '#ccc',
    fontSize: 12,
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
