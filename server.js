const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// JSONとURLエンコードされたデータを解析するミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル（HTML/CSS）の提供用フォルダ設定
app.use(express.static(path.join(__dirname, 'public')));

// メモリ上にリマインダーを保存する配列（簡易データベース代わり）
let reminders = [];

// 1. リマインダー一覧の取得
app.get('/api/reminders', (req, res) => {
    res.json(reminders);
});

// 2. 新しい時限リマインダーの登録
app.post('/api/reminders', (req, res) => {
    const { title, delaySeconds } = req.body;

    if (!title || !delaySeconds || isNaN(delaySeconds)) {
        return res.status(400).json({ error: 'タイトルと正しい秒数を入力してください。' });
    }

    const id = Date.now().toString();
    const delayMs = parseInt(delaySeconds) * 1000;
    const triggerAt = new Date(Date.now() + delayMs).toLocaleTimeString();

    const newReminder = {
        id,
        title,
        delaySeconds,
        triggerAt,
        status: '待機中'
    };

    reminders.push(newReminder);

    // 📌 時限処理：指定秒数後にステータスを更新する（サーバーサイドの時限タイマー）
    setTimeout(() => {
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
            reminder.status = '⏰ 時間です！';
            console.log(`[リマインダー通知]: "${reminder.title}" の時間になりました！`);
            process.stdout.write('\x07');
        }
    }, delayMs);

    res.status(201).json(newReminder);
});

// 3. 期限切れリマインダーのクリア
app.delete('/api/reminders', (req, res) => {
    reminders = reminders.filter(r => r.status === '待機中');
    res.json({ message: '終了したリマインダーを削除しました。', reminders });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました。`);
});
