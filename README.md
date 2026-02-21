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
│   │   ├── utils/               # 計算ロジック（Jest対象）
│   │   └── screens/             # 画面群
│   └── package.json
├── backend/                     # Python FastAPI
│   ├── main.py                  # APIサーバー
│   ├── score_engine.py          # 点数配分ロジック
│   ├── tests/                   # pytest
│   └── pyproject.toml
└── .gitignore
```

## ローカル開発: サーバー起動手順

### 1. バックエンドサーバー（FastAPI）を起動

```bash
cd backend
uv run python main.py
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

### 3. commit時の自動チェック（typecheck + lint + format）

```bash
cd frontend
npm install
```

- `npm install` 時に Git hook が自動設定されます（`simple-git-hooks`）。
- 以後 `git commit` 実行時に以下が自動実行されます:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run format:check`
- 手動実行コマンド:

```bash
cd frontend
npm run precommit:check
```

## Dockerでバックエンドを起動する

このリポジトリの Docker 設定は **バックエンド（FastAPI）のみ** です。
フロントエンド（Expo）は通常どおり `npm start` で起動してください。

### 1. 事前準備（初回のみ）

```bash
cp .env.example .env
```

必要に応じて `.env` の `OPENAI_API_KEY` などを設定します。

### 2. 開発用（ホットリロードあり）

```bash
docker compose up --build
```

- API URL: `http://localhost:8000`
- `docker-compose.yml` では `./backend:/app` をマウントしているため、コード変更が即時反映されます。

停止:

```bash
docker compose down
```

### 3. 本番想定で起動（ローカル確認用）

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

停止:

```bash
docker compose -f docker-compose.prod.yml down
```

### 4. よく使う Docker コマンド

ログ確認:

```bash
docker compose logs -f backend
```

コンテナ内で pytest 実行:

```bash
docker compose exec backend uv run pytest
```

イメージ再ビルド（キャッシュなし）:

```bash
docker compose build --no-cache backend
```

## 品質チェック / テスト

### Frontend（TypeScript strict, ESLint, Prettier, Jest）

- TypeScript strict: `frontend/tsconfig.json` で `strict: true`
- Lint: `npm run lint`（ESLint）
- Format check: `npm run format:check`（Prettier）
- Format apply: `npm run format`
- Jest（計算ロジックのみ）: `npm test`
  - 対象: `frontend/src/utils/*.test.ts`
  - 例: `frontend/src/utils/scoreCalculator.test.ts`

### Backend（pytest）

- 実行コマンド:

```bash
cd backend
uv run pytest
```

### GitHub Actions（main マージ後）

- `main` ブランチへの push（マージ完了後）で `Build Check` が実行されます。
- 内容:
  - Frontend: `typecheck` + `lint` + `jest`
  - Backend: `py_compile` + `pytest`

## 現在実装済みの機能

- 4人の点数管理（25000点スタート）
- 東場/南場、本場、供託の管理
- ロン/ツモの点数計算（翻/符から直接選択）
- 親/子の点数差対応
- 履歴管理と Undo 機能
- AsyncStorage によるデータ永続化
- FastAPI による麻雀計算エンジン（`mahjong` ライブラリ使用）

## このアプリでの麻雀ルール（運用ルール）

このアプリは **4人打ち・東南戦** を前提にしています。

- 開始点: 各プレイヤー `25000` 点
- 場の進行:
  - 東1局〜東4局、南1局〜南4局を管理
  - 親和了時は連荘（本場+1）
  - 親流れ時は親が次へ移動（本場は0へ）
- 本場・供託:
  - ロン: 放銃者が `本場×300` を追加支払い
  - ツモ: 非和了者それぞれが `本場×100` を追加支払い
  - リーチ宣言: 宣言時に `-1000`、供託 `+1`
  - 和了時: 和了者が供託（`供託×1000`）を受け取り、供託は0にリセット
- 終局条件:
  - 南4局で親が連荘しない場合に終局
  - 南4局で親連荘時、親がトップならアガリやめで終局
  - いずれかのプレイヤーがマイナス点でトビ終了

### 注意点（現状仕様）

- 赤ドラは未対応です。
- 終局条件は段階的に実装中で、細かなローカルルール（延長条件など）は今後拡張予定です。
