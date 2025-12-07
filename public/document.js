document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://localhost:3000/api/notes';

    const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    const addNoteBtn = document.getElementById('add-note-btn');
    const notesContainer = document.getElementById('notes-container');
    const archivedNotesContainer = document.getElementById('archived-notes-container');
    const tabButtons = document.querySelectorAll('.tab-btn');

    let notes = [];

    async function fetchNotes() {
        const response = await fetch(API_URL);
        notes = await response.json();
        displayNotes();
    }

    function displayNotes() {
        notesContainer.innerHTML = '';
        archivedNotesContainer.innerHTML = '';

        notes.forEach(note => {
            createNoteElement(note);
        });
    }

    function createNoteElement(note) {
        const isArchived = note.archived;

        const noteElement = document.createElement('div');
        noteElement.className = `note ${isArchived ? 'archived' : ''}`;

        noteElement.innerHTML = `
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <div class="date">Створено: ${new Date(note.createdAt).toLocaleString()}</div>
            <div class="actions">
                <button class="edit-btn">Редагувати</button>
                ${isArchived
                ? `<button class="unarchive-btn">Розархівувати</button>`
                : `<button class="archive-btn">Архівувати</button>`}
                <button class="delete-btn">Видалити</button>
            </div>
        `;

        const container = isArchived ? archivedNotesContainer : notesContainer;
        container.appendChild(noteElement);

        noteElement.querySelector('.edit-btn').addEventListener('click', () => editNote(note));
        noteElement.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));

        if (isArchived) {
            noteElement.querySelector('.unarchive-btn').addEventListener('click', () => toggleArchive(note.id));
        } else {
            noteElement.querySelector('.archive-btn').addEventListener('click', () => toggleArchive(note.id));
        }
    }

    async function addNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();

        if (title && content) {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });

            if (response.ok) {
                noteTitleInput.value = '';
                noteContentInput.value = '';
                await fetchNotes();
            }
        }
    }

    async function editNote(note) {
        const newTitle = prompt('Введіть новий заголовок:', note.title);
        const newContent = prompt('Введіть новий текст:', note.content);

        if (newTitle !== null && newContent !== null) {
            await fetch(`${API_URL}/${note.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    content: newContent.trim()
                })
            });
            await fetchNotes();
        }
    }

    async function toggleArchive(id) {
        await fetch(`${API_URL}/${id}/archive`, { method: 'PATCH' });
        await fetchNotes();
    }

    async function deleteNote(id) {
        if (confirm('Ви впевнені, що хочете видалити цю нотатку?')) {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            await fetchNotes();
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (button.dataset.tab === 'active') {
                notesContainer.style.display = 'grid';
                archivedNotesContainer.style.display = 'none';
            } else {
                notesContainer.style.display = 'none';
                archivedNotesContainer.style.display = 'grid';
            }
        });
    });

    addNoteBtn.addEventListener('click', addNote);
    fetchNotes();
});
