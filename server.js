const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const SECRET_KEY = "supersecretjwtkey";
const db = new Database('./notes.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    categoryId TEXT,
    userId TEXT,
    archived INTEGER,
    createdAt TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    user TEXT,
    time TEXT
  )
`).run();

function logAction(action, user = "Гість") {
    const stmt = db.prepare('INSERT INTO logs (action, user, time) VALUES (?, ?, ?)');
    stmt.run(action, user, new Date().toISOString());
}

function getUsers() {
    return db.prepare('SELECT * FROM users').all();
}

function addUser(user) {
    const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
    stmt.run(user.id, user.username, user.password);
}

function getCategories() {
    return db.prepare('SELECT * FROM categories').all();
}

function getNotesByUser(userId) {
    return db.prepare('SELECT * FROM notes WHERE userId = ?').all(userId);
}

function addNote(note) {
    const stmt = db.prepare(`
        INSERT INTO notes (id, title, content, categoryId, userId, archived, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(note.id, note.title, note.content, note.categoryId, note.userId, note.archived ? 1 : 0, note.createdAt);
}

function updateNote(note) {
    const stmt = db.prepare(`
        UPDATE notes SET title = ?, content = ?, categoryId = ?, archived = ? WHERE id = ? AND userId = ?
    `);
    stmt.run(note.title, note.content, note.categoryId, note.archived ? 1 : 0, note.id, note.userId);
}

function deleteNote(noteId, userId) {
    const stmt = db.prepare('DELETE FROM notes WHERE id = ? AND userId = ?');
    stmt.run(noteId, userId);
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Немає токена" });

    const token = header.split(" ")[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Невірний токен" });
        req.user = decoded;
        next();
    });
}

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();

    if (!username || !password) return res.status(400).json({ message: "Введіть логін та пароль" });
    if (users.some(u => u.username === username)) return res.status(400).json({ message: "Користувач вже існує" });

    const hash = bcrypt.hashSync(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hash };
    addUser(newUser);

    logAction("Реєстрація", username);
    res.json({ message: "Користувача зареєстровано!" });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();

    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ message: "Невірне ім'я або пароль" });

    const passOk = bcrypt.compareSync(password, user.password);
    if (!passOk) return res.status(400).json({ message: "Невірне ім'я або пароль" });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);

    logAction("Вхід в аккаунт", username);
    res.json({ message: "Успішний вхід", token });
});

app.get('/api/categories', authMiddleware, (req, res) => {
    const categories = getCategories();
    res.json(categories);
});

app.get('/api/notes', authMiddleware, (req, res) => {
    const notes = getNotesByUser(req.user.id);
    const categories = getCategories();

    const userNotes = notes.map(n => ({
        ...n,
        categoryName: categories.find(c => c.id === n.categoryId)?.name || "Без категорії",
        author: req.user.username,
        archived: !!n.archived
    }));

    res.json(userNotes);
});

app.post('/api/notes', authMiddleware, (req, res) => {
    const { title, content, categoryId } = req.body;
    const newNote = {
        id: Date.now().toString(),
        title,
        content,
        categoryId,
        userId: req.user.id,
        archived: 0,
        createdAt: new Date().toISOString()
    };
    addNote(newNote);
    logAction("Створив нотатку", req.user.username);
    res.json({ message: "Нотатку створено" });
});

app.put('/api/notes/:id', authMiddleware, (req, res) => {
    const note = {
        id: req.params.id,
        title: req.body.title,
        content: req.body.content,
        categoryId: req.body.categoryId,
        userId: req.user.id,
        archived: req.body.archived || 0
    };
    updateNote(note);
    logAction("Редагував нотатку", req.user.username);
    res.json({ message: "Оновлено" });
});

app.patch('/api/notes/:id/archive', authMiddleware, (req, res) => {
    const notes = getNotesByUser(req.user.id);
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ message: "Нотатка не знайдена" });

    note.archived = note.archived ? 0 : 1;
    updateNote(note);
    logAction("Змінив архівний статус", req.user.username);
    res.json({ message: "Готово" });
});

app.delete('/api/notes/:id', authMiddleware, (req, res) => {
    deleteNote(req.params.id, req.user.id);
    logAction("Видалив нотатку", req.user.username);
    res.json({ message: "Видалено" });
});

const fs = require('fs');
const categoriesData = JSON.parse(fs.readFileSync('./categories.json', 'utf8'));
const existingCategories = db.prepare('SELECT * FROM categories').all();

categoriesData.forEach(cat => {
    if (!existingCategories.find(c => c.id === cat.id)) {
        db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(cat.id, cat.name);
    }
});

app.listen(3000, () => {
    console.log("Сервер працює: http://localhost:3000");
});