import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ScoreboardScreen } from './src/screens/ScoreboardScreen';
import { StartGameScreen } from './src/screens/StartGameScreen';
import { RecordWinScreen } from './src/screens/RecordWinScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

type Screen = 'scoreboard' | 'startGame' | 'recordWin' | 'history';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('scoreboard');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'startGame':
        return <StartGameScreen onBack={() => setCurrentScreen('scoreboard')} />;
      case 'recordWin':
        return <RecordWinScreen onBack={() => setCurrentScreen('scoreboard')} />;
      case 'history':
        return <HistoryScreen onBack={() => setCurrentScreen('scoreboard')} />;
      default:
        return (
          <ScoreboardScreen
            onStartGame={() => setCurrentScreen('startGame')}
            onRecordWin={() => setCurrentScreen('recordWin')}
            onShowHistory={() => setCurrentScreen('history')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
