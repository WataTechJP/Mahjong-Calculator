# Mahjong Calculator

## プロジェクト構造

```text
Mahjong Calculator/
├── frontend/                    # React Native (Expo)
│   ├── App.tsx                  # メインエントリ
│   ├── src/
│   │   ├── types/mahjong.ts     # 型定義
│   │   ├── store/gameStore.ts   # Zustand状態管理
│   │   ├── api/client.ts        # APIクライアント
│   │   └── screens/             # 画面群
│   └── package.json
├── backend/                     # Python FastAPI
│   ├── main.py                  # APIサーバー
│   └── requirements.txt
└── .gitignore
```

## ローカル開発: サーバー起動手順

### 1. バックエンドサーバー（FastAPI）を起動

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

- 起動後: `http://localhost:8000`
- 備考: `OPENAI_API_KEY` 未設定時、`/recognize` は開発用ダミーデータを返します。

### 2. フロントエンド（Expo）を起動

別ターミナルで実行:

```bash
cd frontend
npm install
npm start
```

必要に応じて:

```bash
npm run ios
npm run android
```

## 現在実装済みの機能

- 4人の点数管理（25000点スタート）
- 東場/南場、本場、供託の管理
- ロン/ツモの点数計算（翻/符から直接選択）
- 親/子の点数差対応
- 履歴管理と Undo 機能
- AsyncStorage によるデータ永続化
- FastAPI による麻雀計算エンジン（`mahjong` ライブラリ使用）
