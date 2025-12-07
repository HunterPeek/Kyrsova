const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const NOTES_FILE = path.join(__dirname, 'notes.json');

// Middleware
app.use(express.static('public'));
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' https://www.gstatic.com;");
    next();
});

// Завантаження нотаток з файлу
let notes = [];
try {
    const data = fs.readFileSync(NOTES_FILE, 'utf8');
    notes = JSON.parse(data);
} catch (err) {
    console.log('📄 notes.json порожній або не знайдено, створюємо новий');
}

// Функція для збереження нотаток у файл
function saveNotesToFile() {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// --- API Роути ---

app.get('/api/notes', (req, res) => {
    res.json(notes);
});

app.post('/api/notes', (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    const newNote = {
        id: Date.now().toString(),
        title,
        content,
        createdAt: new Date().toISOString(),
        archived: false
    };

    notes.push(newNote);
    saveNotesToFile();
    res.status(201).json(newNote);
});

app.patch('/api/notes/:id/archive', (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    note.archived = !note.archived;
    saveNotesToFile();
    res.json(note);
});

app.put('/api/notes/:id', (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    note.title = title;
    note.content = content;
    saveNotesToFile();
    res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
    const initialLength = notes.length;
    notes = notes.filter(n => n.id !== req.params.id);

    if (notes.length === initialLength) {
        return res.status(404).json({ error: 'Note not found' });
    }

    saveNotesToFile();
    res.status(204).send();
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер працює на http://localhost:${PORT}`);
});
