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
import type { TileId, RecognizedTile, Wind, TileInput, ScoreResult, MeldType, MeldFrom } from '../types/mahjong';

interface Props {
  onBack: () => void;
  mode?: 'image' | 'manual';
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

interface EditableMeld {
  type: MeldType;
  from?: MeldFrom;
  tiles: EditableTile[];
}

const VALID_TILE_ID = /^[1-9][mps]$|^[1-7]z$/;
const MELD_FROM_LABELS: Record<MeldFrom, string> = {
  kamicha: '上家',
  toimen: '対面',
  shimocha: '下家',
};

export function TileRecognitionScreen({ onBack, mode = 'image' }: Props) {
  const { players, round, applyRon, applyTsumo, advanceRound } = useGameStore();

  // 画像
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 手牌 (13枚 + 和了牌)
  const [handTiles, setHandTiles] = useState<EditableTile[]>([]);
  const [winTile, setWinTile] = useState<EditableTile | null>(null);

  // 副露
  const [melds, setMelds] = useState<EditableMeld[]>([]);

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
    const selectedIndex = editingIndex;

    const getCurrentEditingTileId = (): string | undefined => {
      if (editingType === 'hand') return handTiles[selectedIndex]?.id;
      if (editingType === 'win') return winTile?.id;
      if (editingType === 'meld') return melds[editingMeldIndex]?.tiles[selectedIndex]?.id;
      return undefined;
    };

    if (tileId !== '' && mode === 'manual' && (editingType === 'hand' || editingType === 'win' || editingType === 'meld')) {
      const currentEditingTileId = getCurrentEditingTileId();
      const allSelected = [
        ...handTiles.map((t) => t.id),
        ...(winTile ? [winTile.id] : []),
        ...melds.flatMap((m) => m.tiles.map((t) => t.id)),
      ];
      const currentCount = allSelected.filter((id) => id === tileId).length;
      const adjustedCount = currentEditingTileId === tileId ? currentCount - 1 : currentCount;
      if (adjustedCount >= 4) {
        Alert.alert('入力制限', `${tileId} は4枚までです。`);
        return;
      }
    }

    if (editingType === 'hand') {
      if (tileId === '') {
        // 削除
        setHandTiles((prev) => prev.filter((_, i) => i !== selectedIndex));
      } else {
        setHandTiles((prev) => {
          if (selectedIndex >= prev.length) {
            return [...prev, { id: tileId, confidence: 1.0 }];
          }
          return prev.map((t, i) => (i === selectedIndex ? { id: tileId, confidence: 1.0 } : t));
        });
      }
    } else if (editingType === 'win') {
      if (tileId === '') {
        setWinTile(null);
      } else {
        setWinTile({ id: tileId, confidence: 1.0 });
      }
    } else if (editingType === 'dora') {
      if (tileId === '') {
        setDoraTiles((prev) => prev.filter((_, i) => i !== selectedIndex));
      } else {
        if (selectedIndex >= doraTiles.length) {
          setDoraTiles((prev) => [...prev, { id: tileId, confidence: 1.0 }]);
        } else {
          setDoraTiles((prev) =>
            prev.map((t, i) => (i === selectedIndex ? { id: tileId, confidence: 1.0 } : t))
          );
        }
      }
    } else if (editingType === 'meld') {
      if (tileId === '') {
        setMelds((prev) =>
          prev.map((m, mi) =>
            mi === editingMeldIndex
              ? { ...m, tiles: m.tiles.filter((_, ti) => ti !== selectedIndex) }
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
                    ti === selectedIndex ? { id: tileId, confidence: 1.0 } : t
                  ),
                }
              : m
          )
        );
      }
    }

    // 手入力モードでは、手牌選択後にモーダルを閉じず次スロットへ移動して連続入力できるようにする
    if (mode === 'manual' && editingType === 'hand' && tileId !== '') {
      const nextIndex = selectedIndex + 1;
      if (nextIndex < 13) {
        setEditingIndex(nextIndex);
      } else {
        setPickerVisible(false);
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
  const addMeld = (type: MeldType) => {
    const count = type === 'kan' || type === 'ankan' ? 4 : 3;
    const newMeld = {
      type,
      from: type === 'ankan' ? undefined : ('kamicha' as MeldFrom),
      tiles: Array(count).fill({ id: '?', confidence: 0.5 }),
    };
    setMelds((prev) => [...prev, newMeld]);
  };

  const updateMeldType = (meldIndex: number, type: MeldType) => {
    setMelds((prev) =>
      prev.map((m, i) => {
        if (i !== meldIndex) return m;
        const targetCount = type === 'kan' || type === 'ankan' ? 4 : 3;
        const tiles = [...m.tiles];
        if (tiles.length > targetCount) {
          tiles.splice(targetCount);
        }
        while (tiles.length < targetCount) {
          tiles.push({ id: '?', confidence: 0.5 });
        }
        return {
          ...m,
          type,
          from: type === 'ankan' ? undefined : (m.from || 'kamicha'),
          tiles,
        };
      })
    );
  };

  const clearAllTiles = () => {
    setHandTiles([]);
    setWinTile(null);
    setMelds([]);
    setDoraTiles([]);
    setResult(null);
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
    if (handTiles.length === 0) {
      Alert.alert('エラー', '手牌を入力してください。');
      return;
    }
    if (!winTile) {
      Alert.alert('エラー', '和了牌を選択してください。');
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
    if (!isTsumo && loserIndex === winnerIndex) {
      Alert.alert('エラー', '和了者と放銃者は別のプレイヤーを選択してください。');
      return;
    }

    const hasUnknownTile =
      [...handTiles, winTile, ...doraTiles, ...melds.flatMap((m) => m.tiles)]
        .some((tile) => tile.id === '?' || !VALID_TILE_ID.test(tile.id));
    if (hasUnknownTile) {
      Alert.alert('エラー', '不明な牌があります。? の牌を修正してから計算してください。');
      return;
    }

    const meldShapeInvalid = melds.some((m) => {
      if (m.type === 'kan') return m.tiles.length !== 4;
      return m.tiles.length !== 3;
    });
    if (meldShapeInvalid) {
      Alert.alert('エラー', '副露の枚数が不正です。チー/ポンは3枚、カンは4枚にしてください。');
      return;
    }

    // 手牌13枚相当: 手牌 + (副露の有効消費枚数) = 13
    // カンは手牌消費3枚として扱う（加槓/嶺上ツモ分の補充を考慮）。
    const effectiveMeldConsumption = melds.reduce(
      (sum, m) => sum + (m.type === 'kan' ? 3 : m.tiles.length),
      0
    );
    if (handTiles.length + effectiveMeldConsumption !== 13) {
      Alert.alert(
        'エラー',
        `手牌枚数が不正です。現在: 手牌${handTiles.length}枚 + 副露換算${effectiveMeldConsumption}枚 = ${
          handTiles.length + effectiveMeldConsumption
        }枚（13枚必要）`
      );
      return;
    }

    // 同一牌は最大4枚（手牌+和了牌+副露の合算）
    const tileCounts = new Map<string, number>();
    [...handTiles, winTile, ...melds.flatMap((m) => m.tiles)].forEach((t) => {
      tileCounts.set(t.id, (tileCounts.get(t.id) || 0) + 1);
    });
    const overLimit = [...tileCounts.entries()].find(([, count]) => count > 4);
    if (overLimit) {
      Alert.alert('エラー', `${overLimit[0]} が ${overLimit[1]} 枚あります。1種類は最大4枚です。`);
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
          opened: m.type !== 'ankan',
          from: m.from,
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
  const handleConfirm = async () => {
    if (!result || winnerIndex === null) return;

    try {
      if (isTsumo) {
        await applyTsumo(winnerIndex, result, {
          melds: melds.map((m) => ({ type: m.type, from: m.from, opened: m.type !== 'ankan' })),
        });
      } else if (loserIndex !== null) {
        await applyRon(winnerIndex, loserIndex, result, {
          melds: melds.map((m) => ({ type: m.type, from: m.from, opened: m.type !== 'ankan' })),
        });
      }
    } catch (error) {
      Alert.alert('エラー', '点数適用に失敗しました。サーバー接続を確認してください。');
      return;
    }

    advanceRound(winnerIndex === round.dealerIndex);
    onBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{mode === 'image' ? '画像から入力' : '手入力'}</Text>

      {/* 画像取得ボタン */}
      {mode === 'image' && (
        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(true)} activeOpacity={0.7}>
            <Text style={styles.imageButtonText}>撮影</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(false)} activeOpacity={0.7}>
            <Text style={styles.imageButtonText}>ギャラリー</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 画像プレビュー */}
      {mode === 'image' && imageUri && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
        </View>
      )}

      {/* ローディング */}
      {mode === 'image' && isLoading && (
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
            <View style={styles.meldMeta}>
              <View style={styles.meldTypeRow}>
                {(['chi', 'pon', 'kan', 'ankan'] as MeldType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.meldTypeButton, meld.type === type && styles.meldTypeButtonActive]}
                    onPress={() => updateMeldType(meldIndex, type)}
                  >
                    <Text style={[styles.meldTypeText, meld.type === type && styles.meldTypeTextActive]}>
                      {type === 'chi' ? 'チー' : type === 'pon' ? 'ポン' : type === 'kan' ? '明槓' : '暗槓'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {meld.type !== 'ankan' && (
                <View style={styles.meldFromRow}>
                  {(['kamicha', 'toimen', 'shimocha'] as MeldFrom[]).map((from) => (
                    <TouchableOpacity
                      key={from}
                      style={[styles.meldFromButton, meld.from === from && styles.meldFromButtonActive]}
                      onPress={() =>
                        setMelds((prev) =>
                          prev.map((m, i) => (i === meldIndex ? { ...m, from } : m))
                        )
                      }
                    >
                      <Text style={[styles.meldFromText, meld.from === from && styles.meldFromTextActive]}>
                        {MELD_FROM_LABELS[from]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

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
            <Text style={styles.addMeldText}>+明槓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMeldButton} onPress={() => addMeld('ankan')}>
            <Text style={styles.addMeldText}>+暗槓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.clearAllButton} onPress={clearAllTiles} activeOpacity={0.7}>
        <Text style={styles.clearAllButtonText}>選択牌を全削除</Text>
      </TouchableOpacity>

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
        closeOnSelect={mode !== 'manual'}
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
  meldMeta: {
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  meldTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  meldTypeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
  },
  meldTypeButtonActive: {
    backgroundColor: '#3498db',
  },
  meldTypeText: {
    color: '#aaa',
    fontSize: 12,
  },
  meldTypeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  meldFromRow: {
    flexDirection: 'row',
    gap: 6,
  },
  meldFromButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
  },
  meldFromButtonActive: {
    backgroundColor: '#8e44ad',
  },
  meldFromText: {
    color: '#aaa',
    fontSize: 12,
  },
  meldFromTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  clearAllButton: {
    backgroundColor: '#c0392b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  clearAllButtonText: {
    color: '#fff',
    fontWeight: '600',
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
