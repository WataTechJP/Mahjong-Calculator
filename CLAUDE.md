# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Full-stack mahjong score calculator with two independent components:

- **`frontend/`** — React Native (Expo) app with TypeScript
- **`backend/`** — Python FastAPI server (single file: `main.py`)

## Development Commands

### Frontend (React Native / Expo)

```bash
cd frontend
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

### Backend (FastAPI)

```bash
cd backend
uv run python main.py     # Runs on http://localhost:8000
```

### Backend (Tests)

```bash
cd backend
uv run pytest
```

The backend requires `OPENAI_API_KEY` in the environment for tile image recognition. Without it, the `/recognize` endpoint returns hardcoded dummy data for development.

## Frontend Architecture

**Screen navigation** is managed manually via a `currentScreen` state string in `App.tsx` — there is no React Navigation or Expo Router. All screen transitions are prop callbacks.

**Screens** (`src/screens/`):
- `ScoreboardScreen` — main hub, shows scores and navigation buttons
- `StartGameScreen` — player name setup
- `RecordWinScreen` — win input with tile picker and score calculation
- `HistoryScreen` — game history with Undo support
- `TileRecognitionScreen` — camera/image upload for AI tile recognition

**State management**: Zustand store (`src/store/gameStore.ts`) persisted via AsyncStorage under key `'mahjong-game-storage'`. The store handles all score mutations (ron, tsumo, draw, undo) and round progression.

**API client** (`src/api/client.ts`): `API_BASE_URL` is hardcoded to `http://localhost:8000`. Change this when testing on a physical device.

**Tile representation**: Tiles use ID strings like `"1m"` (一萬), `"5p"` (五筒), `"9s"` (九索), `"1z"`–`"7z"` (字牌). Hand input uses `TileInput` with separate fields `man`, `pin`, `sou`, `honors` as digit strings (e.g., `man: "123"` = 1m2m3m).

## Backend Architecture

Single-file FastAPI app (`backend/main.py`) with three endpoints:

- `POST /calculate` — Takes a full hand description and returns han/fu/cost/yaku using the `mahjong` Python library
- `POST /apply-score` — Applies a score result to 4 players' scores (handles tsumo split, honba, riichi sticks)
- `POST /recognize` — Takes a multipart image, calls OpenAI Vision API (`gpt-4o`) to identify tiles, returns `RecognizedTile[]`

**Note**: Score calculation logic is partially duplicated between the frontend (`gameStore.ts`) and the backend (`/apply-score` endpoint). The frontend computes score diffs directly for ron/tsumo; the backend endpoint exists as an alternative path.

The `mahjong` library uses a 136-tile array format. `TilesConverter.string_to_136_array()` converts from the `TileInput` string format.
