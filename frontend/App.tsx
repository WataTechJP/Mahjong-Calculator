import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Animated } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ScoreboardScreen } from './src/screens/ScoreboardScreen';
import { StartGameScreen } from './src/screens/StartGameScreen';
import { RecordWinScreen } from './src/screens/RecordWinScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { TileRecognitionScreen } from './src/screens/TileRecognitionScreen';
import { ManualInputScreen } from './src/screens/ManualInputScreen';
import { FinalResultScreen } from './src/screens/FinalResultScreen';
import { useGameStore } from './src/store/gameStore';

type Screen = 'scoreboard' | 'startGame' | 'recordWin' | 'history' | 'recognition' | 'manualInput';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('scoreboard');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isGameEnded = useGameStore((state) => state.isGameEnded);

  const handleScreenChange = (newScreen: Screen) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(newScreen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderScreen = () => {
    if (isGameEnded) {
      return <FinalResultScreen onStartNewGame={() => handleScreenChange('scoreboard')} />;
    }

    switch (currentScreen) {
      case 'startGame':
        return <StartGameScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'recordWin':
        return <RecordWinScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'history':
        return <HistoryScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'recognition':
        return <TileRecognitionScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'manualInput':
        return <ManualInputScreen onBack={() => handleScreenChange('scoreboard')} />;
      default:
        return (
          <ScoreboardScreen
            onStartGame={() => handleScreenChange('startGame')}
            onRecordWin={() => handleScreenChange('recordWin')}
            onShowHistory={() => handleScreenChange('history')}
            onRecognition={() => handleScreenChange('recognition')}
            onManualInput={() => handleScreenChange('manualInput')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
          {renderScreen()}
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  screenContainer: {
    flex: 1,
  },
});
