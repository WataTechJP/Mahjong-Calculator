import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Animated } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ScoreboardScreen } from './src/screens/ScoreboardScreen';
import { StartGameScreen } from './src/screens/StartGameScreen';
import { RecordWinScreen } from './src/screens/RecordWinScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { TileRecognitionScreen } from './src/screens/TileRecognitionScreen';

type Screen = 'scoreboard' | 'startGame' | 'recordWin' | 'history' | 'recognition';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('scoreboard');
  const fadeAnim = useRef(new Animated.Value(1)).current;

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
    switch (currentScreen) {
      case 'startGame':
        return <StartGameScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'recordWin':
        return <RecordWinScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'history':
        return <HistoryScreen onBack={() => handleScreenChange('scoreboard')} />;
      case 'recognition':
        return <TileRecognitionScreen onBack={() => handleScreenChange('scoreboard')} />;
      default:
        return (
          <ScoreboardScreen
            onStartGame={() => handleScreenChange('startGame')}
            onRecordWin={() => handleScreenChange('recordWin')}
            onShowHistory={() => handleScreenChange('history')}
            onRecognition={() => handleScreenChange('recognition')}
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
