import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  AlertButton,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useGameStore } from '../store/gameStore';
import type { Wind } from '../types/mahjong';

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

const FULLSCREEN_POSITIONS = ['top', 'right', 'bottom', 'left'] as const;
type FullscreenPosition = (typeof FULLSCREEN_POSITIONS)[number];

const FULLSCREEN_ROTATION: Record<FullscreenPosition, string> = {
  top: '180deg',
  right: '-90deg',
  bottom: '0deg',
  left: '90deg',
};

interface Props {
  onStartGame: () => void;
  onRecordWin: () => void;
  onShowHistory: () => void;
  onRecognition: () => void;
  onManualInput: () => void;
}

export function ScoreboardScreen({
  onStartGame,
  onRecordWin,
  onShowHistory,
  onRecognition,
  onManualInput,
}: Props) {
  const [isFullscreenScoreView, setIsFullscreenScoreView] = useState(false);
  const { width, height } = useWindowDimensions();
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
  const edgeCardWidth = Math.max(160, Math.min(width, height) * 0.4);
  const isPortrait = height > width;
  const fullscreenCardPositionStyles: Record<FullscreenPosition, object> = {
    top: { top: 10, left: '50%', marginLeft: -edgeCardWidth / 2 },
    right: { right: 0, top: '50%', marginTop: -50 },
    bottom: { bottom: 10, left: '50%', marginLeft: -edgeCardWidth / 2 },
    left: { left: 0, top: '50%', marginTop: -50 },
  };

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

  useEffect(() => {
    const setOrientation = async () => {
      if (isFullscreenScoreView) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        return;
      }
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };

    setOrientation().catch(() => {
      // Keep the screen functional even if orientation APIs are unavailable on a device.
    });

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {
        // Ignore cleanup errors.
      });
    };
  }, [isFullscreenScoreView]);

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
        <StatusBar barStyle="light-content" />
        <View style={styles.startContainer}>
          <Text style={styles.title}>麻雀点数計算</Text>
          <TouchableOpacity style={styles.startButton} onPress={onStartGame} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>ゲーム開始</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isFullscreenScoreView) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden />
        <View style={styles.fullscreenBoard}>
          {players.map((player, index) => {
            const position = FULLSCREEN_POSITIONS[index];
            const isDealer = index === round.dealerIndex;
            return (
              <View
                key={index}
                style={[
                  styles.fullscreenPlayerCard,
                  fullscreenCardPositionStyles[position],
                  { width: edgeCardWidth, transform: [{ rotate: FULLSCREEN_ROTATION[position] }] },
                  isDealer && styles.fullscreenDealerCard,
                ]}
              >
                <View style={styles.fullscreenCardHeader}>
                  <Text style={styles.fullscreenWindLabel}>{WIND_LABELS[player.wind]}</Text>
                  {isDealer && <Text style={styles.fullscreenDealerLabel}>親</Text>}
                  <Text style={styles.fullscreenPlayerName}>{player.name}</Text>
                </View>
                <Text
                  style={styles.fullscreenPlayerScore}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {player.score.toLocaleString()}
                </Text>
              </View>
            );
          })}
          <View style={styles.fullscreenCenterPanel}>
            <View style={styles.fullscreenRoundInfo}>
              <Text style={styles.fullscreenRoundText}>{getRoundLabel()}</Text>
              <View style={styles.fullscreenRoundDetails}>
                <Text style={styles.fullscreenDetailText}>本場: {round.honba}</Text>
                <Text style={styles.fullscreenDetailText}>供託: {round.riichiSticks}</Text>
              </View>
              {isGameEnded && (
                <Text style={styles.fullscreenEndLabel}>終局: {endReason || '対局終了'}</Text>
              )}
              {isPortrait && (
                <Text style={styles.rotateHint}>横向きにすると4方向表示が見やすくなります</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.exitFullscreenButton}
              onPress={() => setIsFullscreenScoreView(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.exitFullscreenButtonText}>通常表示に戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.utilityTopBar}>
        <TouchableOpacity
          style={styles.utilityTopButton}
          onPress={() => setIsFullscreenScoreView(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.utilityTopButtonText}>横向き</Text>
        </TouchableOpacity>
      </View>
      {/* 局情報 */}
      <View style={styles.roundInfo}>
        <Text style={styles.roundText}>{getRoundLabel()}</Text>
        <View style={styles.roundDetails}>
          <Text style={styles.detailText}>本場: {round.honba}</Text>
          <Text style={styles.detailText}>供託: {round.riichiSticks}</Text>
        </View>
        {isGameEnded && <Text style={styles.endLabel}>終局: {endReason || '対局終了'}</Text>}
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
                  index === round.dealerIndex ? { scale: dealerPulse } : { scale: 1 },
                ],
              },
            ]}
          >
            <View style={styles.playerHeader}>
              <Text style={styles.windLabel}>{WIND_LABELS[player.wind]}</Text>
              {index === round.dealerIndex && <Text style={styles.dealerLabel}>親</Text>}
            </View>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerScore}>{player.score.toLocaleString()}</Text>
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

        <TouchableOpacity
          style={[styles.riichiButton, isGameEnded && styles.disabledButton]}
          onPress={handleDeclareRiichi}
          disabled={isGameEnded}
          activeOpacity={0.7}
        >
          <Text style={styles.riichiButtonText}>リーチ宣言</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.undoPriorityButton, !history.length && styles.disabledButton]}
          onPress={undoLastAction}
          disabled={!history.length}
          activeOpacity={0.7}
        >
          <Text style={styles.undoPriorityButtonText}>取り消し</Text>
        </TouchableOpacity>

        <View style={styles.compactUtilityRow}>
          <TouchableOpacity
            style={styles.compactUtilityButton}
            onPress={onShowHistory}
            activeOpacity={0.7}
          >
            <Text style={styles.compactUtilityButtonText}>履歴</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactDangerButton} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.compactDangerButtonText}>ゲーム終了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  utilityTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#121a2d',
    borderBottomWidth: 1,
    borderBottomColor: '#27304a',
  },
  utilityTopButton: {
    backgroundColor: '#1f6aa2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  utilityTopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    gap: 10,
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
  fullscreenButton: {
    backgroundColor: '#1f6aa2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullscreenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  undoPriorityButton: {
    backgroundColor: '#3f5ec5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  undoPriorityButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  compactUtilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactUtilityButton: {
    flex: 1,
    backgroundColor: '#3b4052',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 9,
  },
  compactUtilityButtonText: {
    color: '#e8edf8',
    fontSize: 13,
    fontWeight: '600',
  },
  compactDangerButton: {
    flex: 1,
    backgroundColor: '#8f2d2d',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 9,
  },
  compactDangerButtonText: {
    color: '#ffe8e8',
    fontSize: 13,
    fontWeight: '700',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#101320',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
  },
  fullscreenRoundInfo: {
    alignItems: 'center',
    gap: 6,
  },
  fullscreenRoundText: {
    color: '#ffd166',
    fontSize: 30,
    fontWeight: 'bold',
  },
  fullscreenRoundDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  fullscreenDetailText: {
    color: '#d5dbe6',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenEndLabel: {
    marginTop: 2,
    color: '#ffba6b',
    fontWeight: '700',
    fontSize: 16,
  },
  rotateHint: {
    color: '#8ea2c3',
    fontSize: 13,
    marginTop: 2,
  },
  fullscreenBoard: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCenterPanel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    transform: [{ rotate: '-90deg' }],
  },
  fullscreenPlayerCard: {
    position: 'absolute',
    backgroundColor: '#24304a',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2f456e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  fullscreenDealerCard: {
    backgroundColor: '#4f3a12',
    borderColor: '#ffd166',
  },
  fullscreenPlayerName: {
    color: '#cfd8ea',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 90,
  },
  fullscreenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fullscreenWindLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  fullscreenDealerLabel: {
    backgroundColor: '#ffd166',
    color: '#442f0a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenPlayerScore: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
  exitFullscreenButton: {
    alignSelf: 'center',
    backgroundColor: '#ee1818ff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitFullscreenButtonText: {
    color: '#ffffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
