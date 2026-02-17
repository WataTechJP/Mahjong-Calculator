
## 概要
Codex CLI（read-only）を用いて、レビュー→Claude Code修正→再レビュー（ok: true まで）を反復し収束させるレビューゲート。Claude Codeが実装・ファイル修正・実装計画の完遂を行った後に実行する。キーワード: Codexレビュー, codex review, レビューゲート.


## 実行タイミング

- Claude Codeが実装・ファイル修正・実装計画の完遂を行った直後
- ユーザーが「Codexレビューを要求する」旨を明示的に伝えたとき
- 複数回の修正を経て、最終確認が必要なタイミング

## 実行手順

1. **Codex CLIの起動**

   ```bash
   codex
   ```

2. **レビューの実行**

   ```
   review
   ```

3. **結果の確認**
   - `ok: true` → 完了
   - `ok: false` → 修正指示をClaude Codeに伝え、再実装を要求

4. **反復**
   - 修正後、再度 `review` を実行
   - `ok: true` になるまで繰り返す

## 注意事項

- Codex CLIは**read-only**モードで使用する
- 修正はClaude Codeが行い、Codex CLIはレビューのみ行う
- `ok: true` が出るまで反復を続ける
- 途中で手動修正は行わない

## ログの保存

- 各レビュー結果は `.claude/logs/codex-review/` ディレクトリに保存する
- ファイル名: `YYYYMMDD_HHMMSS.md`
- ログには以下の情報を含める:
  - 実行日時
  - レビュー対象ファイル
  - Codexの出力
  - Claude Codeの修正内容
  - 最終的な `ok` の値

## 実行例

```
Claude Code: 実装完了しました
User: Codexレビューを要求します

Claude Code: Codex CLIを起動します...
Claude Code: レビューを実行します...
Codex: ok: false

Claude Code: 修正指示を生成しました
Claude Code: 修正を行います...
Claude Code: 修正完了しました
Claude Code: 再レビューを行います...
Codex: ok: true

Claude Code: レビュー完了しました。ok: true
```
