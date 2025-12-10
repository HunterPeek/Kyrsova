document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://localhost:3000/api';

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const authContainer = document.getElementById('auth-container');
    const noteApp = document.getElementById('note-app');
    const userInfo = document.getElementById('user-info');

    const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    const noteCategorySelect = document.getElementById('note-category');
    const addNoteBtn = document.getElementById('add-note-btn');
    const notesContainer = document.getElementById('notes-container');
    const archivedNotesContainer = document.getElementById('archived-notes-container');
    const tabButtons = document.querySelectorAll('.tab-btn');

    let token = localStorage.getItem('token') || null;
    let currentUser = localStorage.getItem('username') || null;
    let categories = [];

    // --- AUTH FUNCTIONS ---
    async function login() {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value.trim() })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            currentUser = JSON.parse(atob(token.split('.')[1])).username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', currentUser);
            showNoteApp();
        } else alert(data.message);
    }

    async function register() {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value.trim() })
        });
        const data = await res.json();
        alert(data.message || 'Реєстрація успішна, увійдіть.');
    }

    function logout() {
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        notesContainer.innerHTML = '';
        archivedNotesContainer.innerHTML = '';
        noteCategorySelect.innerHTML = '';
        noteApp.style.display = 'none';
        authContainer.style.display = 'block';
    }

    function showNoteApp() {
        authContainer.style.display = 'none';
        noteApp.style.display = 'block';
        if (currentUser) userInfo.textContent = `Ви увійшли як: ${currentUser}`;
        fetchCategories();
        fetchNotes();
    }

    // --- NOTES FUNCTIONS ---
    async function fetchCategories() {
        const res = await fetch(`${API_URL}/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        categories = await res.json();
        noteCategorySelect.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            noteCategorySelect.appendChild(option);
        });
    }

    async function fetchNotes() {
        notesContainer.innerHTML = '';
        archivedNotesContainer.innerHTML = '';
        const res = await fetch(`${API_URL}/notes`, { headers: { 'Authorization': `Bearer ${token}` } });
        const notes = await res.json();
        notes.forEach(note => createNoteElement(note));
    }

    function createNoteElement(note) {
        const isArchived = !!note.archived;
        const container = isArchived ? archivedNotesContainer : notesContainer;
        const noteElement = document.createElement('div');
        noteElement.className = `note ${isArchived ? 'archived' : ''}`;
        noteElement.innerHTML = `
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <p>Категорія: ${note.categoryName}</p>
            <p>Автор: ${note.author}</p>
            <div class="date">Створено: ${new Date(note.createdAt).toLocaleString()}</div>
            <div class="actions">
                <button class="edit-btn">Редагувати</button>
                ${isArchived
                    ? `<button class="unarchive-btn">Розархівувати</button>`
                    : `<button class="archive-btn">Архівувати</button>`}
                <button class="delete-btn">Видалити</button>
            </div>
        `;
        container.appendChild(noteElement);

        noteElement.querySelector('.edit-btn').addEventListener('click', () => editNote(note));
        noteElement.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));
        if (isArchived) noteElement.querySelector('.unarchive-btn').addEventListener('click', () => toggleArchive(note.id));
        else noteElement.querySelector('.archive-btn').addEventListener('click', () => toggleArchive(note.id));
    }

    async function addNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        const categoryId = noteCategorySelect.value;
        if (!title || !content) return;
        await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, content, categoryId })
        });
        noteTitleInput.value = '';
        noteContentInput.value = '';
        fetchNotes();
    }

    async function editNote(note) {
        const newTitle = prompt('Введіть новий заголовок:', note.title);
        const newContent = prompt('Введіть новий текст:', note.content);
        if (newTitle === null || newContent === null) return;
        await fetch(`${API_URL}/notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim(), categoryId: note.categoryId })
        });
        fetchNotes();
    }

    async function toggleArchive(id) {
        await fetch(`${API_URL}/notes/${id}/archive`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
        fetchNotes();
    }

    async function deleteNote(id) {
        if (!confirm('Ви впевнені, що хочете видалити цю нотатку?')) return;
        await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchNotes();
    }

    // --- TAB SWITCH ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            notesContainer.style.display = button.dataset.tab === 'active' ? 'grid' : 'none';
            archivedNotesContainer.style.display = button.dataset.tab === 'archived' ? 'grid' : 'none';
        });
    });

    // --- EVENT LISTENERS ---
    loginBtn.addEventListener('click', login);
    registerBtn.addEventListener('click', register);
    logoutBtn.addEventListener('click', logout);
    addNoteBtn.addEventListener('click', addNote);

    if (token && currentUser) showNoteApp();
});
