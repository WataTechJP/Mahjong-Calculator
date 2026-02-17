# Issue #7: fix: モダンでアニメーションが豊富なUIデザインに修正

Issue URL: https://github.com/WataTechJP/Mahjong-Calculator/issues/7

## Original Issue
## 📝 概要
重くならない程度でアニメーションをつけてUIを向上させる
UXも同時に向上

## 🎯 目的


## 🛠 対応内容


## 📸 参考


## Goal
- Issueの内容を満たすための実装方針を明確化する。

## Scope
- In Scope:
  -  と  のうち、Issueに関連する変更点の整理
  - 必要な画面/API/状態管理の修正タスク定義
- Out of Scope:
  - 追加要件の拡張実装
  - 本Issueに無関係なリファクタ

## Implementation Tasks
- [ ] Issue本文を要件単位に分解する
- [ ] 影響範囲を  /  / API契約に分類する
- [ ] 実装手順を依存順で並べる（先に型・データ構造、次にUI/API）
- [ ] 完了条件（受け入れ基準）を各タスクに紐付ける
- [ ] レビュー観点（回帰リスク、互換性、操作性）を整理する

## Risks
- Issue本文の情報不足により、実装前に追加確認が必要になる可能性。
- UI変更時に既存フロー（開始/記録/履歴）へ回帰が入る可能性。
- API変更が入る場合、frontend側との不整合が発生する可能性。

## Validation
- [ ] 影響機能の手動確認手順を記載する
- [ ] 既存の主要フローが維持されることを確認する
- [ ] 差分レビューで Scope外変更がないことを確認する

## Rollback
- 問題発生時はこのIssue向け変更コミットのみをrevertする。
- API契約変更がある場合は、frontend/backendを同時に元に戻す。
