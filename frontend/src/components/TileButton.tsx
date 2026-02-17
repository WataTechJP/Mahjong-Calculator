import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { TileId } from '../types/mahjong';

// 牌IDから表示名へのマッピング
export const TILE_DISPLAY: Record<string, { name: string; color: string }> = {
  // 萬子 (赤)
  '1m': { name: '一萬', color: '#e74c3c' },
  '2m': { name: '二萬', color: '#e74c3c' },
  '3m': { name: '三萬', color: '#e74c3c' },
  '4m': { name: '四萬', color: '#e74c3c' },
  '5m': { name: '五萬', color: '#e74c3c' },
  '6m': { name: '六萬', color: '#e74c3c' },
  '7m': { name: '七萬', color: '#e74c3c' },
  '8m': { name: '八萬', color: '#e74c3c' },
  '9m': { name: '九萬', color: '#e74c3c' },
  // 筒子 (青)
  '1p': { name: '一筒', color: '#3498db' },
  '2p': { name: '二筒', color: '#3498db' },
  '3p': { name: '三筒', color: '#3498db' },
  '4p': { name: '四筒', color: '#3498db' },
  '5p': { name: '五筒', color: '#3498db' },
  '6p': { name: '六筒', color: '#3498db' },
  '7p': { name: '七筒', color: '#3498db' },
  '8p': { name: '八筒', color: '#3498db' },
  '9p': { name: '九筒', color: '#3498db' },
  // 索子 (緑)
  '1s': { name: '一索', color: '#27ae60' },
  '2s': { name: '二索', color: '#27ae60' },
  '3s': { name: '三索', color: '#27ae60' },
  '4s': { name: '四索', color: '#27ae60' },
  '5s': { name: '五索', color: '#27ae60' },
  '6s': { name: '六索', color: '#27ae60' },
  '7s': { name: '七索', color: '#27ae60' },
  '8s': { name: '八索', color: '#27ae60' },
  '9s': { name: '九索', color: '#27ae60' },
  // 字牌
  '1z': { name: '東', color: '#2c3e50' },
  '2z': { name: '南', color: '#2c3e50' },
  '3z': { name: '西', color: '#2c3e50' },
  '4z': { name: '北', color: '#2c3e50' },
  '5z': { name: '白', color: '#95a5a6' },
  '6z': { name: '發', color: '#27ae60' },
  '7z': { name: '中', color: '#e74c3c' },
  // 不明
  '?': { name: '?', color: '#7f8c8d' },
};

// 簡易表示用 (数字 + スート記号)
export const TILE_SHORT: Record<string, string> = {
  '1m': '1萬', '2m': '2萬', '3m': '3萬', '4m': '4萬', '5m': '5萬',
  '6m': '6萬', '7m': '7萬', '8m': '8萬', '9m': '9萬',
  '1p': '1筒', '2p': '2筒', '3p': '3筒', '4p': '4筒', '5p': '5筒',
  '6p': '6筒', '7p': '7筒', '8p': '8筒', '9p': '9筒',
  '1s': '1索', '2s': '2索', '3s': '3索', '4s': '4索', '5s': '5索',
  '6s': '6索', '7s': '7索', '8s': '8索', '9s': '9索',
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
  '?': '?',
};

interface TileButtonProps {
  tileId: TileId;
  onPress?: () => void;
  selected?: boolean;
  confidence?: number;
  size?: 'small' | 'medium' | 'large';
  showWarning?: boolean;
}

export function TileButton({
  tileId,
  onPress,
  selected = false,
  confidence,
  size = 'medium',
  showWarning = false,
}: TileButtonProps) {
  const tileInfo = TILE_DISPLAY[tileId] || TILE_DISPLAY['?'];
  const isLowConfidence = confidence !== undefined && confidence < 0.8;
  const displayWarning = showWarning || isLowConfidence;

  const sizeStyles = {
    small: { width: 36, height: 48, fontSize: 14 },
    medium: { width: 44, height: 58, fontSize: 16 },
    large: { width: 52, height: 68, fontSize: 18 },
  };

  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          width: currentSize.width,
          height: currentSize.height,
          borderColor: displayWarning ? '#e74c3c' : selected ? '#FFD700' : '#555',
          borderWidth: displayWarning || selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.tileText,
          { fontSize: currentSize.fontSize, color: tileInfo.color },
        ]}
      >
        {TILE_SHORT[tileId] || tileId}
      </Text>
      {displayWarning && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>!</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// 空の牌スロット (追加用)
interface EmptyTileSlotProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function EmptyTileSlot({ onPress, size = 'medium' }: EmptyTileSlotProps) {
  const sizeStyles = {
    small: { width: 36, height: 48 },
    medium: { width: 44, height: 58 },
    large: { width: 52, height: 68 },
  };

  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[styles.emptySlot, { width: currentSize.width, height: currentSize.height }]}
      onPress={onPress}
    >
      <Text style={styles.emptyText}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#f5f5dc',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  tileText: {
    fontWeight: 'bold',
  },
  warningBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptySlot: {
    backgroundColor: '#2d2d44',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  emptyText: {
    color: '#888',
    fontSize: 24,
  },
});
