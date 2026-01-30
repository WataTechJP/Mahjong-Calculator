プロジェクト構造

Mahjong Calculator/
├── frontend/                    # React Native (Expo)
│   ├── App.tsx                  # メインエントリ
│   ├── src/
│   │   ├── types/mahjong.ts     # 型定義
│   │   ├── store/gameStore.ts   # Zustand状態管理
│   │   ├── api/client.ts        # APIクライアント
│   │   └── screens/
│   │       ├── ScoreboardScreen.tsx   # スコアボード
│   │       ├── StartGameScreen.tsx    # ゲーム開始
│   │       ├── RecordWinScreen.tsx    # 和了入力
│   │       └── HistoryScreen.tsx      # 履歴
│   └── package.json
├── backend/                     # Python FastAPI
│   ├── main.py                  # APIサーバー
│   ├── requirements.txt
│   └── venv/
└── .gitignore
起動方法
フロントエンド:


cd frontend
npm start
バックエンド:


cd backend
source venv/bin/activate
python main.py
現在実装済みの機能
4人の点数管理（25000点スタート）
東場/南場、本場、供託の管理
ロン/ツモの点数計算（翻/符から直接選択）
親/子の点数差対応
履歴管理とUndo機能
AsyncStorageによるデータ永続化
FastAPIによる麻雀計算エンジン（mahjongライブラリ使用）
次のステップとして、画像認識機能の追加や牌選択UIの実装を進められます。
