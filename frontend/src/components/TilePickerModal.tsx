import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TileButton, TILE_DISPLAY } from './TileButton';
import type { TileId } from '../types/mahjong';

type TileCategory = 'man' | 'pin' | 'sou' | 'honor';

const TILE_CATEGORIES: Record<TileCategory, { label: string; tiles: TileId[] }> = {
  man: {
    label: '萬子',
    tiles: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'],
  },
  pin: {
    label: '筒子',
    tiles: ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'],
  },
  sou: {
    label: '索子',
    tiles: ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'],
  },
  honor: {
    label: '字牌',
    tiles: ['1z', '2z', '3z', '4z', '5z', '6z', '7z'],
  },
};

interface TilePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (tileId: TileId) => void;
  currentTileId?: TileId;
  title?: string;
}

export function TilePickerModal({
  visible,
  onClose,
  onSelect,
  currentTileId,
  title = '牌を選択',
}: TilePickerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<TileCategory>('man');

  const handleSelect = (tileId: TileId) => {
    onSelect(tileId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* カテゴリタブ */}
          <View style={styles.tabs}>
            {(Object.keys(TILE_CATEGORIES) as TileCategory[]).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.tab,
                  selectedCategory === category && styles.tabActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCategory === category && styles.tabTextActive,
                  ]}
                >
                  {TILE_CATEGORIES[category].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 牌グリッド */}
          <ScrollView style={styles.tilesContainer}>
            <View style={styles.tilesGrid}>
              {TILE_CATEGORIES[selectedCategory].tiles.map((tileId) => (
                <TileButton
                  key={tileId}
                  tileId={tileId}
                  size="large"
                  selected={currentTileId === tileId}
                  onPress={() => handleSelect(tileId)}
                />
              ))}
            </View>
          </ScrollView>

          {/* 削除ボタン */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              onSelect('');
              onClose();
            }}
          >
            <Text style={styles.deleteText}>この牌を削除</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tilesContainer: {
    paddingHorizontal: 16,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#c0392b',
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
