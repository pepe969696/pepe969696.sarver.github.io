const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const path = require('path');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// フロントエンドの静的ファイル（HTML/CSS）を公開する設定
app.use(express.static(path.join(__dirname, 'public')));

// 1. データベースの初期化（Renderのディスク容量を考慮しカレントディレクトリに保存）
const db = new sqlite3.Database(path.join(__dirname, 'reminders.db'), (err) => {
    if (err) console.error('DB接続エラー:', err.message);
    console.log('SQLiteデータベースに接続しました。');
});

// テーブル作成
db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    send_at TEXT NOT NULL,
    is_sent INTEGER DEFAULT 0
)`);

// 2. APIエンドポイント: リマインダーの登録
app.post('/api/reminders', (req, res) => {
    const { email, content, send_at } = req.body;
    if (!email || !content || !send_at) {
        return res.status(400).json({ error: 'すべての項目を入力してください。' });
    }

    const sql = `INSERT INTO messages (email, content, send_at) VALUES (?, ?, ?)`;
    db.run(sql, [email, content, send_at], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true, message: '未来へのメッセージを保管しました。' });
    });
});

// 3. バックグラウンド処理: 毎分ごとに送信チェック（JSTタイムゾーンを考慮）
cron.schedule('* * * * *', () => {
    // サーバーの現在時刻を 'YYYY-MM-DD HH:MM' 形式で取得
    const nowJST = new Date(Date.now() + ((new Date().getTimezoneOffset() + 540) * 60000));
    const nowStr = nowJST.toISOString().replace('T', ' ').substring(0, 16);
    
    console.log(`[${nowStr}] 送信対象をチェック中...`);

    const selectSql = `SELECT * FROM messages WHERE send_at <= ? AND is_sent = 0`;
    db.all(selectSql, [nowStr], (err, rows) => {
        if (err) return console.error('データ取得エラー:', err.message);

        rows.forEach((row) => {
            // ログへの擬似送信（実運用時はここでメールAPI等を実行）
            console.log(`【タイムカプセル発信】 To: ${row.email} | 内容: ${row.content}`);

            // 送信済フラグを更新
            db.run(`UPDATE messages SET is_sent = 1 WHERE id = ?`, [row.id]);
        });
    });
});

// Renderの割り当てポート、または3000番で起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました。`);
});
