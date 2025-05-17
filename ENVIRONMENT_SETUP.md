# 環境構築手順書

本ドキュメントでは、動物病院向けLINEチャットボット＋予約システムを個人開発者が構築する際の環境準備手順をまとめます。

## 1. 前提条件
- Google アカウントを保有し、Apps Script と Google Sheets が利用可能であること。
- LINE Official Account Manager にアクセスできること。

## 2. LINE 公式アカウントの作成
1. [LINE Official Account Manager](https://manager.line.biz/) にログインする。
2. 新規アカウントを作成し、プロバイダーとチャネルを登録する。
3. チャネルシークレットとチャネルアクセストークンを控えておく。

## 3. Google Sheets の準備
1. 新しいスプレッドシートを作成する。
2. 以下の3シートを作成し、列構成を設定する。
   - `slots` : `slotId` / `date` / `start` / `end` / `doctor` / `capacity` / `reserved`
   - `reservations` : `bookingId` / `slotId` / `ownerId` / `petName` / `species` / `status` / `createdAt`
   - `logs` : `time` / `userId` / `direction` / `payload`
3. 後でスクリプトから操作できるよう、シートのURLを控えておく。

## 4. Google Apps Script プロジェクトの作成
1. [Google Apps Script](https://script.google.com/) を開き、新規プロジェクトを作成する。
2. プロジェクト名をわかりやすく設定し、ランタイムがV8であることを確認する。
3. チャネルシークレットやアクセストークン、シートIDをスクリプトプロパティに保存する。

## 5. Web アプリとしてのデプロイ
1. メニューから **「デプロイ」→「新しいデプロイ」** を選択し、種類を **「ウェブアプリ」** に設定する。
2. 実行権限を「自分」、アクセス権を「全員（匿名ユーザーを含む）」もしくは「リンクを知っているユーザー」に設定する。
3. デプロイ後に表示されるURLを控える。LINE Webhookのエンドポイントとして利用する。

## 6. LINE チャネル設定
1. LINE Official Account Managerのチャネル設定画面を開く。
2. 「Messaging API」設定でWebhooksを有効化し、先ほど控えたApps ScriptのURLをWebhook URLに登録する。
3. 自動応答メッセージやあいさつメッセージを必要に応じて無効化する。

## 7. 日次トリガーの設定
1. Apps Script の「トリガー」メニューから新しい時間主導トリガーを作成する。
2. 毎日0:00など希望する時刻に実行されるよう設定し、予約枠を再生成する関数を指定する。

## 8. 簡易動作確認
1. LINE公式アカウントを自分のLINEで友だち追加する。
2. テスト用メッセージを送信し、Webhookが正しく反応するか確認する。
3. `logs` シートに履歴が残るか、`listSlots` などの処理結果を確認する。

---
以上で環境構築は完了です。Apps Script にコードを追加し、チャットボットおよび予約システムの実装を進めてください。
