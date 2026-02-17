# Repository Guidelines

## Project Structure & Module Organization
This repository has two app surfaces:
- `frontend/`: Expo React Native app in TypeScript.
- `backend/`: FastAPI service in Python.

Frontend code lives in `frontend/src/`:
- `screens/` for UI flows (`ScoreboardScreen.tsx`, `RecordWinScreen.tsx`)
- `components/` for reusable UI pieces
- `store/` for Zustand state (`gameStore.ts`)
- `api/` for backend calls (`client.ts`)
- `types/` for shared TypeScript models

Backend is currently centered in `backend/main.py` with API routes for score calculation, score application, and tile recognition.

## Build, Test, and Development Commands
Frontend:
- `cd frontend && npm install` installs dependencies.
- `cd frontend && npm start` starts Expo dev server.
- `cd frontend && npm run ios` launches iOS simulator build.
- `cd frontend && npm run android` launches Android emulator build.

Backend:
- `cd backend && python -m venv venv && source venv/bin/activate` creates/activates a venv.
- `cd backend && pip install -r requirements.txt` installs backend dependencies.
- `cd backend && python main.py` runs FastAPI on `http://localhost:8000`.

## Coding Style & Naming Conventions
- TypeScript: 2-space indentation, `camelCase` for variables/functions, `PascalCase` for React components and screen files.
- Python: PEP 8 style, 4-space indentation, `snake_case` for functions/variables, `PascalCase` for Pydantic models.
- Keep state mutations inside the store layer (`frontend/src/store/`) and keep UI components declarative.

## Testing Guidelines
There is no committed automated test suite yet. For each change:
- Validate frontend flows manually in Expo (start game, score update, history/undo, tile recognition screen).
- Validate backend endpoints with local requests (for example, `POST /calculate`, `POST /apply-score`).
- Include reproducible manual test steps in PR descriptions.

## Commit & Pull Request Guidelines
Git history uses short, imperative messages with optional prefixes (for example, `fix: calculate with uploaded pictures`). Follow:
- Commit format: `<type>: <brief change>` where practical (`feat`, `fix`, `refactor`, `docs`).
- One logical change per commit.
- PRs should include purpose, key changes, manual test evidence, and screenshots/video for UI changes.

## Security & Configuration Tips
- Set `OPENAI_API_KEY` for production tile recognition behavior in backend `/recognize`.
- Update `API_BASE_URL` in `frontend/src/api/client.ts` when testing on physical devices.
- Never commit secrets or local `.env` files.
