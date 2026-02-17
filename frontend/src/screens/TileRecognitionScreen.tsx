import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { TileButton, EmptyTileSlot } from '../components/TileButton';
import { TilePickerModal } from '../components/TilePickerModal';
import { recognizeTiles, calculateScore } from '../api/client';
import { useGameStore } from '../store/gameStore';
import type { TileId, RecognizedTile, Wind, TileInput, ScoreResult } from '../types/mahjong';

interface Props {
  onBack: () => void;
}

const WIND_LABELS: Record<Wind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
};

interface EditableTile {
  id: TileId;
  confidence: number;
}

export function TileRecognitionScreen({ onBack }: Props) {
  const { players, round, applyRon, applyTsumo, advanceRound } = useGameStore();

  // 画像
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 手牌 (13枚 + 和了牌)
  const [handTiles, setHandTiles] = useState<EditableTile[]>([]);
  const [winTile, setWinTile] = useState<EditableTile | null>(null);

  // 副露
  const [melds, setMelds] = useState<{ type: 'chi' | 'pon' | 'kan'; tiles: EditableTile[] }[]>([]);

  // ドラ
  const [doraTiles, setDoraTiles] = useState<EditableTile[]>([]);

  // ゲーム条件
  const [isTsumo, setIsTsumo] = useState(false);
  const [isRiichi, setIsRiichi] = useState(false);
  const [playerWind, setPlayerWind] = useState<Wind>('east');
  const [roundWind, setRoundWind] = useState<Wind>(round.roundWind);

  // モーダル
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'hand' | 'win' | 'dora' | 'meld'>('hand');
  const [editingMeldIndex, setEditingMeldIndex] = useState<number>(0);

  // 和了者/放銃者
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [loserIndex, setLoserIndex] = useState<number | null>(null);

  // 計算結果
  const [result, setResult] = useState<ScoreResult | null>(null);

  // 画像選択
  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('権限エラー', 'カメラ/ギャラリーへのアクセス権限が必要です');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        await recognizeImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('エラー', '画像の取得に失敗しました');
    }
  };

  // 画像認識
  const recognizeImage = async (uri: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await recognizeTiles(uri);

      if (response.error) {
        Alert.alert('認識エラー', response.error);
        return;
      }

      // 認識結果を手牌にセット
      const tiles: EditableTile[] = response.tiles.map((t) => ({
        id: t.id,
        confidence: t.confidence,
      }));

      // 14枚目を和了牌として分離
      if (tiles.length >= 14) {
        setHandTiles(tiles.slice(0, 13));
        setWinTile(tiles[13]);
      } else if (tiles.length === 13) {
        setHandTiles(tiles);
        setWinTile(null);
      } else {
        setHandTiles(tiles);
        setWinTile(null);
      }

      // 低信頼度の牌があれば警告
      const lowConfidence = tiles.filter((t) => t.confidence < 0.8);
      if (lowConfidence.length > 0) {
        Alert.alert(
          '確認が必要',
          `${lowConfidence.length}枚の牌が認識に自信がありません。赤枠の牌をタップして修正してください。`
        );
      }
    } catch (error) {
      Alert.alert('エラー', '画像認識に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 牌編集モーダルを開く
  const openPicker = (type: 'hand' | 'win' | 'dora' | 'meld', index: number, meldIndex?: number) => {
    setEditingType(type);
    setEditingIndex(index);
    if (meldIndex !== undefined) {
      setEditingMeldIndex(meldIndex);
    }
    setPickerVisible(true);
  };

  // 牌選択時の処理
  const handleTileSelect = (tileId: TileId) => {
    if (editingIndex === null) return;

    if (editingType === 'hand') {
      if (tileId === '') {
        // 削除
        setHandTiles((prev) => prev.filter((_, i) => i !== editingIndex));
      } else {
        setHandTiles((prev) =>
          prev.map((t, i) => (i === editingIndex ? { id: tileId, confidence: 1.0 } : t))
        );
      }
    } else if (editingType === 'win') {
      if (tileId === '') {
        setWinTile(null);
      } else {
        setWinTile({ id: tileId, confidence: 1.0 });
      }
    } else if (editingType === 'dora') {
      if (tileId === '') {
        setDoraTiles((prev) => prev.filter((_, i) => i !== editingIndex));
      } else {
        if (editingIndex >= doraTiles.length) {
          setDoraTiles((prev) => [...prev, { id: tileId, confidence: 1.0 }]);
        } else {
          setDoraTiles((prev) =>
            prev.map((t, i) => (i === editingIndex ? { id: tileId, confidence: 1.0 } : t))
          );
        }
      }
    } else if (editingType === 'meld') {
      if (tileId === '') {
        setMelds((prev) =>
          prev.map((m, mi) =>
            mi === editingMeldIndex
              ? { ...m, tiles: m.tiles.filter((_, ti) => ti !== editingIndex) }
              : m
          )
        );
      } else {
        setMelds((prev) =>
          prev.map((m, mi) =>
            mi === editingMeldIndex
              ? {
                  ...m,
                  tiles: m.tiles.map((t, ti) =>
                    ti === editingIndex ? { id: tileId, confidence: 1.0 } : t
                  ),
                }
              : m
          )
        );
      }
    }
  };

  // 手牌に牌を追加
  const addHandTile = () => {
    if (handTiles.length < 13) {
      setEditingType('hand');
      setEditingIndex(handTiles.length);
      setPickerVisible(true);
    }
  };

  // 副露を追加
  const addMeld = (type: 'chi' | 'pon' | 'kan') => {
    const count = type === 'kan' ? 4 : 3;
    const newMeld = {
      type,
      tiles: Array(count).fill({ id: '?', confidence: 0.5 }),
    };
    setMelds((prev) => [...prev, newMeld]);
  };

  // TileInputに変換
  const tilesToTileInput = (tiles: EditableTile[]): TileInput => {
    const result: TileInput = { man: '', pin: '', sou: '', honors: '' };

    tiles.forEach((t) => {
      if (t.id.endsWith('m')) {
        result.man += t.id[0];
      } else if (t.id.endsWith('p')) {
        result.pin += t.id[0];
      } else if (t.id.endsWith('s')) {
        result.sou += t.id[0];
      } else if (t.id.endsWith('z')) {
        result.honors += t.id[0];
      }
    });

    return result;
  };

  // 点数計算
  const handleCalculate = async () => {
    if (handTiles.length < 1) {
      Alert.alert('エラー', '手牌を入力してください');
      return;
    }
    if (!winTile) {
      Alert.alert('エラー', '和了牌を選択してください');
      return;
    }
    if (winnerIndex === null) {
      Alert.alert('エラー', '和了者を選択してください');
      return;
    }
    if (!isTsumo && loserIndex === null) {
      Alert.alert('エラー', '放銃者を選択してください');
      return;
    }

    try {
      // 手牌に和了牌を含めて14枚にする（麻雀ライブラリの仕様）
      const allHandTiles = [...handTiles, winTile];
      const handInput = tilesToTileInput(allHandTiles);
      const winInput = tilesToTileInput([winTile]);
      const doraInput = tilesToTileInput(doraTiles);

      const calcResult = await calculateScore({
        hand: handInput,
        win_tile: winInput,
        melds: melds.map((m) => ({
          type: m.type,
          tiles: tilesToTileInput(m.tiles),
          opened: m.type !== 'kan' || true, // 暗槓以外はopen
        })),
        dora_indicators: doraInput,
        player_wind: playerWind,
        round_wind: roundWind,
        is_tsumo: isTsumo,
        is_riichi: isRiichi,
        is_ippatsu: false,
        is_rinshan: false,
        is_chankan: false,
        is_haitei: false,
        is_daburu_riichi: false,
        is_tenhou: false,
        is_chiihou: false,
      });

      if (calcResult.error) {
        Alert.alert('計算エラー', calcResult.error);
        return;
      }

      setResult(calcResult);
    } catch (error) {
      Alert.alert('エラー', '点数計算に失敗しました');
    }
  };

  // 確定して適用
  const handleConfirm = () => {
    if (!result || winnerIndex === null) return;

    if (isTsumo) {
      applyTsumo(winnerIndex, result);
    } else if (loserIndex !== null) {
      applyRon(winnerIndex, loserIndex, result);
    }

    advanceRound(winnerIndex === round.dealerIndex);
    onBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>画像から入力</Text>

      {/* 画像取得ボタン */}
      <View style={styles.imageButtons}>
        <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(true)} activeOpacity={0.7}>
          <Text style={styles.imageButtonText}>撮影</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(false)} activeOpacity={0.7}>
          <Text style={styles.imageButtonText}>ギャラリー</Text>
        </TouchableOpacity>
      </View>

      {/* 画像プレビュー */}
      {imageUri && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
        </View>
      )}

      {/* ローディング */}
      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>認識中...</Text>
        </View>
      )}

      {/* 手牌 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>手牌 ({handTiles.length}/13)</Text>
        <View style={styles.tilesRow}>
          {handTiles.map((tile, index) => (
            <TileButton
              key={index}
              tileId={tile.id}
              confidence={tile.confidence}
              onPress={() => openPicker('hand', index)}
              size="medium"
            />
          ))}
          {handTiles.length < 13 && <EmptyTileSlot onPress={addHandTile} />}
        </View>
      </View>

      {/* 和了牌 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>和了牌</Text>
        <View style={styles.tilesRow}>
          {winTile ? (
            <TileButton
              tileId={winTile.id}
              confidence={winTile.confidence}
              onPress={() => openPicker('win', 0)}
              size="medium"
            />
          ) : (
            <EmptyTileSlot onPress={() => openPicker('win', 0)} />
          )}
        </View>
      </View>

      {/* 副露 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>副露</Text>
        {melds.map((meld, meldIndex) => (
          <View key={meldIndex} style={styles.meldRow}>
            <Text style={styles.meldLabel}>
              {meld.type === 'chi' ? 'チー' : meld.type === 'pon' ? 'ポン' : 'カン'}
            </Text>
            {meld.tiles.map((tile, tileIndex) => (
              <TileButton
                key={tileIndex}
                tileId={tile.id}
                confidence={tile.confidence}
                onPress={() => openPicker('meld', tileIndex, meldIndex)}
                size="small"
              />
            ))}
            <TouchableOpacity
              style={styles.removeMeld}
              onPress={() => setMelds((prev) => prev.filter((_, i) => i !== meldIndex))}
            >
              <Text style={styles.removeMeldText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.meldButtons}>
          <TouchableOpacity style={styles.addMeldButton} onPress={() => addMeld('chi')}>
            <Text style={styles.addMeldText}>+チー</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMeldButton} onPress={() => addMeld('pon')}>
            <Text style={styles.addMeldText}>+ポン</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMeldButton} onPress={() => addMeld('kan')}>
            <Text style={styles.addMeldText}>+カン</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ドラ表示牌 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ドラ表示牌</Text>
        <View style={styles.tilesRow}>
          {doraTiles.map((tile, index) => (
            <TileButton
              key={index}
              tileId={tile.id}
              onPress={() => openPicker('dora', index)}
              size="small"
            />
          ))}
          {doraTiles.length < 5 && (
            <EmptyTileSlot onPress={() => openPicker('dora', doraTiles.length)} size="small" />
          )}
        </View>
      </View>

      {/* ロン/ツモ */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, !isTsumo && styles.toggleActive]}
            onPress={() => setIsTsumo(false)}
          >
            <Text style={[styles.toggleText, !isTsumo && styles.toggleTextActive]}>ロン</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isTsumo && styles.toggleActive]}
            onPress={() => setIsTsumo(true)}
          >
            <Text style={[styles.toggleText, isTsumo && styles.toggleTextActive]}>ツモ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 和了者選択 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>和了者</Text>
        <View style={styles.playerGrid}>
          {players.map((player, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.playerButton, winnerIndex === index && styles.playerButtonActive]}
              onPress={() => {
                setWinnerIndex(index);
                if (loserIndex === index) setLoserIndex(null);
              }}
            >
              <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
              <Text style={styles.playerName}>{player.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 放銃者選択（ロンの場合のみ） */}
      {!isTsumo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>放銃者</Text>
          <View style={styles.playerGrid}>
            {players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.playerButton,
                  loserIndex === index && styles.playerButtonLoser,
                  winnerIndex === index && styles.playerButtonDisabled,
                ]}
                onPress={() => winnerIndex !== index && setLoserIndex(index)}
                disabled={winnerIndex === index}
              >
                <Text style={styles.playerWind}>{WIND_LABELS[player.wind]}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 風設定 */}
      <View style={styles.section}>
        <View style={styles.windRow}>
          <Text style={styles.windLabel}>場風:</Text>
          {(['east', 'south'] as Wind[]).map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.windButton, roundWind === w && styles.windButtonActive]}
              onPress={() => setRoundWind(w)}
            >
              <Text style={[styles.windText, roundWind === w && styles.windTextActive]}>
                {WIND_LABELS[w]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.windRow}>
          <Text style={styles.windLabel}>自風:</Text>
          {(['east', 'south', 'west', 'north'] as Wind[]).map((w) => (
            <TouchableOpacity
              key={w}
              style={[styles.windButton, playerWind === w && styles.windButtonActive]}
              onPress={() => setPlayerWind(w)}
            >
              <Text style={[styles.windText, playerWind === w && styles.windTextActive]}>
                {WIND_LABELS[w]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* リーチ */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.riichiButton, isRiichi && styles.riichiButtonActive]}
          onPress={() => setIsRiichi(!isRiichi)}
        >
          <Text style={[styles.riichiText, isRiichi && styles.riichiTextActive]}>リーチ</Text>
        </TouchableOpacity>
      </View>

      {/* 計算ボタン */}
      <TouchableOpacity style={styles.calculateButton} onPress={handleCalculate} activeOpacity={0.7}>
        <Text style={styles.calculateButtonText}>計算する</Text>
      </TouchableOpacity>

      {/* 計算結果 */}
      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>計算結果</Text>
          <Text style={styles.resultHanFu}>
            {result.han}翻 {result.fu}符
          </Text>
          <Text style={styles.resultScore}>
            {isTsumo
              ? `${result.cost.main}/${result.cost.additional || result.cost.main}`
              : `${result.cost.main}点`}
          </Text>
          {result.yaku.length > 0 && (
            <View style={styles.yakuList}>
              {result.yaku.map((y, i) => (
                <Text key={i} style={styles.yakuItem}>
                  {y.name} ({y.han}翻)
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.7}>
            <Text style={styles.confirmButtonText}>確定して適用</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* キャンセル */}
      <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.cancelButtonText}>キャンセル</Text>
      </TouchableOpacity>

      {/* 牌選択モーダル */}
      <TilePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleTileSelect}
        currentTileId={
          editingType === 'hand'
            ? handTiles[editingIndex || 0]?.id
            : editingType === 'win'
            ? winTile?.id
            : editingType === 'dora'
            ? doraTiles[editingIndex || 0]?.id
            : melds[editingMeldIndex]?.tiles[editingIndex || 0]?.id
        }
        title="牌を選択"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    height: 150,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loading: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  meldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#2d2d44',
    padding: 8,
    borderRadius: 8,
  },
  meldLabel: {
    color: '#aaa',
    marginRight: 8,
    width: 40,
  },
  removeMeld: {
    marginLeft: 'auto',
    padding: 4,
  },
  removeMeldText: {
    color: '#e74c3c',
    fontSize: 18,
  },
  meldButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addMeldButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 6,
  },
  addMeldText: {
    color: '#888',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 18,
    color: '#aaa',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  playerButtonActive: {
    backgroundColor: '#4CAF50',
  },
  playerButtonLoser: {
    backgroundColor: '#c0392b',
  },
  playerButtonDisabled: {
    opacity: 0.3,
  },
  playerWind: {
    fontSize: 16,
    color: '#FFD700',
  },
  playerName: {
    fontSize: 14,
    color: '#fff',
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  windLabel: {
    color: '#aaa',
    marginRight: 12,
    width: 50,
  },
  windButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#2d2d44',
  },
  windButtonActive: {
    backgroundColor: '#9b59b6',
  },
  windText: {
    color: '#aaa',
  },
  windTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  riichiButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
  },
  riichiButtonActive: {
    backgroundColor: '#e74c3c',
  },
  riichiText: {
    fontSize: 16,
    color: '#aaa',
  },
  riichiTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calculateButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultSection: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  resultHanFu: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  yakuList: {
    marginTop: 12,
    width: '100%',
  },
  yakuItem: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 2,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
