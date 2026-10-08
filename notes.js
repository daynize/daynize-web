/* 나만의 복습 노트: localStorage 기반 메모장 (목록 / 에디터 / 삭제 확인) */
(() => {
    'use strict';

    const STORAGE_KEY = 'daynize.notes.v1';
    const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
    const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

    const TEMPLATE = `
<dialog class="notes-dialog" id="notes-dialog" aria-labelledby="notes-title">
    <section class="notes-view" data-view="list">
        <header class="notes-head">
            <div>
                <h2 id="notes-title">나만의 복습 노트</h2>
                <p>공부한 내용, 기억하고 싶은 문장, 참고할 링크를 자유롭게 기록해 보세요.</p>
            </div>
            <button type="button" class="notes-close" data-act="close" aria-label="노트 닫기">×</button>
        </header>
        <div class="notes-toolbar">
            <span class="notes-count" aria-live="polite"></span>
            <button type="button" class="notes-btn" data-act="new">+ 새 노트 작성</button>
        </div>
        <div class="notes-scroll">
            <div class="notes-empty" hidden>
                <div class="notes-empty-icon" aria-hidden="true">📝</div>
                <strong>아직 작성한 노트가 없어요</strong>
                <p>오늘 배운 문장이나 기억하고 싶은 표현을 한 줄만 적어 보세요.</p>
                <button type="button" class="notes-btn big" data-act="new">+ 새 노트 작성하기</button>
            </div>
            <div class="notes-grid"></div>
        </div>
    </section>
    <section class="notes-view" data-view="editor" hidden>
        <header class="notes-editor-head">
            <button type="button" class="notes-btn secondary" data-act="back">← 목록</button>
            <span class="spacer"></span>
            <span class="notes-status" role="status" aria-live="polite"></span>
            <button type="button" class="notes-editor-trash" data-act="trash" aria-label="이 노트 삭제">${TRASH_ICON}</button>
            <button type="button" class="notes-btn" data-act="back">완료</button>
        </header>
        <div class="notes-editor-scroll">
            <input class="notes-title-input" type="text" maxlength="100" placeholder="제목을 입력하세요" aria-label="노트 제목" autocomplete="off">
            <div class="notes-date"></div>
            <div class="notes-body is-empty" role="textbox" aria-multiline="true" aria-label="노트 본문" data-placeholder="여기에 자유롭게 적어 보세요. http:// 또는 https:// 주소는 자동으로 링크가 됩니다."></div>
        </div>
    </section>
</dialog>
<dialog class="notes-confirm" id="notes-confirm" aria-labelledby="notes-confirm-title">
    <h3 id="notes-confirm-title">노트를 삭제할까요?</h3>
    <p class="notes-confirm-text"></p>
    <div class="notes-confirm-actions">
        <button type="button" class="notes-btn secondary" data-confirm="cancel">취소</button>
        <button type="button" class="notes-btn danger" data-confirm="ok">삭제</button>
    </div>
</dialog>`;

    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (ts) => { const d = new Date(ts); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
    const formatDateTime = (ts) => { const d = new Date(ts); return `${formatDate(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const uid = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    const firstLine = (body) => (body.split('\n').find((line) => line.trim()) || '').trim();
    const displayTitle = (note) => note.title.trim() || firstLine(note.body).slice(0, 60) || '제목 없는 노트';
    const previewText = (note) => {
        if (note.title.trim()) return note.body.trim();
        const lines = note.body.split('\n');
        const index = lines.findIndex((line) => line.trim());
        return index < 0 ? '' : lines.slice(index + 1).join('\n').trim();
    };

    const safeUrl = (text) => {
        try {
            const url = new URL(text.trim());
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
        } catch (_) {
            return null;
        }
    };
    // 문장 끝 구두점은 링크에서 제외한다.
    const splitUrl = (raw) => { const url = raw.replace(/[.,!?;:)\]}'"]+$/, ''); return [url, raw.slice(url.length)]; };

    const init = (options = {}) => {
        document.body.insertAdjacentHTML('beforeend', TEMPLATE);
        const dialog = document.getElementById('notes-dialog');
        const confirmDialog = document.getElementById('notes-confirm');
        const listView = dialog.querySelector('[data-view="list"]');
        const editorView = dialog.querySelector('[data-view="editor"]');
        const grid = dialog.querySelector('.notes-grid');
        const empty = dialog.querySelector('.notes-empty');
        const countLabel = dialog.querySelector('.notes-count');
        const toolbar = dialog.querySelector('.notes-toolbar');
        const titleInput = dialog.querySelector('.notes-title-input');
        const body = dialog.querySelector('.notes-body');
        const dateLabel = dialog.querySelector('.notes-date');
        const status = dialog.querySelector('.notes-status');

        body.contentEditable = 'plaintext-only';
        const plaintextOnly = body.contentEditable === 'plaintext-only';
        if (!plaintextOnly) body.contentEditable = 'true';

        let notes = [];
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(saved)) notes = saved.filter((n) => n && typeof n.id === 'string' && typeof n.body === 'string' && typeof n.title === 'string');
        } catch (_) { /* 손상된 데이터는 무시 */ }

        let current = null;
        let composing = false;

        const notify = () => { if (options.onChange) options.onChange(notes.length); };
        const persist = () => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
                return true;
            } catch (_) {
                status.textContent = '⚠ 저장 공간이 부족해 저장하지 못했어요.';
                return false;
            }
        };
        const sorted = () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

        const renderList = () => {
            grid.replaceChildren();
            empty.hidden = notes.length > 0;
            toolbar.hidden = notes.length === 0;
            countLabel.textContent = `노트 ${notes.length}개`;
            sorted().forEach((note) => {
                const card = document.createElement('article');
                card.className = 'note-card';
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.dataset.id = note.id;
                const heading = document.createElement('h3');
                heading.textContent = displayTitle(note);
                const time = document.createElement('time');
                time.dateTime = new Date(note.updatedAt).toISOString();
                time.textContent = formatDate(note.updatedAt);
                const preview = document.createElement('p');
                const text = previewText(note);
                preview.textContent = text || '추가 내용이 없어요';
                if (!text) preview.className = 'is-muted';
                const trash = document.createElement('button');
                trash.type = 'button';
                trash.className = 'note-trash';
                trash.dataset.act = 'delete';
                trash.setAttribute('aria-label', `${displayTitle(note)} 삭제`);
                trash.innerHTML = TRASH_ICON;
                card.append(heading, time, preview, trash);
                grid.append(card);
            });
        };

        const showList = () => {
            editorView.hidden = true;
            listView.hidden = false;
            renderList();
        };

        // 본문 DOM -> 일반 텍스트
        const readText = () => {
            let out = '';
            const walk = (node) => {
                node.childNodes.forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue;
                    else if (child.nodeName === 'BR') out += '\n';
                    else if (child.nodeType === Node.ELEMENT_NODE) {
                        const block = child.nodeName === 'DIV' || child.nodeName === 'P';
                        if (block && out && !out.endsWith('\n')) out += '\n';
                        walk(child);
                    }
                });
            };
            walk(body);
            return out.replace(/\u200b/g, '');
        };

        // 일반 텍스트 -> URL이 링크로 바뀐 DOM
        const writeText = (text) => {
            const fragment = document.createDocumentFragment();
            let last = 0;
            for (const match of text.matchAll(URL_PATTERN)) {
                const [url, tail] = splitUrl(match[0]);
                const href = safeUrl(url);
                if (!href) continue;
                if (match.index > last) fragment.append(text.slice(last, match.index));
                const anchor = document.createElement('a');
                anchor.href = href;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.textContent = url;
                fragment.append(anchor);
                if (tail) fragment.append(tail);
                last = match.index + match[0].length;
            }
            if (last < text.length) fragment.append(text.slice(last));
            body.replaceChildren(fragment);
        };

        const caretOffset = () => {
            const sel = getSelection();
            if (!sel.rangeCount || !body.contains(sel.anchorNode)) return null;
            const range = document.createRange();
            range.selectNodeContents(body);
            range.setEnd(sel.anchorNode, sel.anchorOffset);
            return range.toString().length;
        };
        const placeCaret = (offset) => {
            const sel = getSelection();
            const range = document.createRange();
            const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
            let remaining = offset;
            let node;
            while ((node = walker.nextNode())) {
                const len = node.nodeValue.length;
                const inAnchor = node.parentElement && node.parentElement.nodeName === 'A';
                if (remaining < len || (remaining === len && !inAnchor)) {
                    range.setStart(node, remaining);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return;
                }
                remaining -= len;
            }
            range.selectNodeContents(body);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        const urlsIn = (text) => [...text.matchAll(URL_PATTERN)].map((m) => splitUrl(m[0])[0]).filter(safeUrl);
        const linkify = () => {
            const text = readText();
            const wanted = urlsIn(text);
            const linked = [...body.querySelectorAll('a')].map((a) => a.textContent);
            if (wanted.length === linked.length && wanted.every((u, i) => u === linked[i])) return;
            const offset = plaintextOnly ? caretOffset() : null;
            writeText(text);
            if (offset !== null) placeCaret(offset);
        };

        const syncEmptyState = () => body.classList.toggle('is-empty', readText().length === 0);

        const refreshEditorMeta = () => {
            dateLabel.textContent = `작성 ${formatDate(current.createdAt)} · 최종 수정 ${formatDateTime(current.updatedAt)}`;
        };

        const save = () => {
            if (!current) return;
            const hasContent = current.title.trim() || current.body.trim();
            const stored = notes.includes(current);
            if (!stored && !hasContent) return;
            current.updatedAt = Date.now();
            if (!stored) notes.push(current);
            if (persist()) status.textContent = `자동 저장됨 · ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
            refreshEditorMeta();
            notify();
        };

        const openEditor = (note) => {
            const isNew = !note;
            current = note || { id: uid(), title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
            titleInput.value = current.title;
            writeText(current.body);
            syncEmptyState();
            status.textContent = isNew ? '입력하면 자동으로 저장돼요' : '';
            dialog.querySelector('[data-act="trash"]').hidden = isNew;
            refreshEditorMeta();
            listView.hidden = true;
            editorView.hidden = false;
            editorView.querySelector('.notes-editor-scroll').scrollTop = 0;
            (isNew ? titleInput : body).focus();
        };

        const leaveEditor = () => {
            if (!current) return showList();
            if (!composing) { current.body = readText(); linkify(); }
            current.title = titleInput.value;
            if (!notes.includes(current)) save();
            current = null;
            showList();
        };

        const confirmDelete = (note) => new Promise((resolve) => {
            confirmDialog.querySelector('.notes-confirm-text').textContent = `“${displayTitle(note)}” 노트는 삭제하면 되돌릴 수 없어요.`;
            const finish = (value) => {
                confirmDialog.removeEventListener('click', onClick);
                confirmDialog.removeEventListener('close', onClose);
                if (confirmDialog.open) confirmDialog.close();
                resolve(value);
            };
            const onClick = (event) => {
                const choice = event.target.closest('[data-confirm]');
                if (choice) finish(choice.dataset.confirm === 'ok');
            };
            const onClose = () => finish(false);
            confirmDialog.addEventListener('click', onClick);
            confirmDialog.addEventListener('close', onClose);
            confirmDialog.showModal();
            confirmDialog.querySelector('[data-confirm="cancel"]').focus();
        });

        const removeNote = async (note) => {
            if (!(await confirmDelete(note))) return false;
            notes = notes.filter((n) => n !== note);
            persist();
            notify();
            return true;
        };

        dialog.addEventListener('click', async (event) => {
            if (event.target === dialog && !listView.hidden) { dialog.close(); return; }
            const anchor = event.target.closest('.notes-body a');
            if (anchor) {
                event.preventDefault();
                const href = safeUrl(anchor.textContent);
                if (href) window.open(href, '_blank', 'noopener,noreferrer');
                return;
            }
            const actionButton = event.target.closest('[data-act]');
            const card = event.target.closest('.note-card');
            if (actionButton && actionButton.dataset.act === 'delete' && card) {
                event.stopPropagation();
                const note = notes.find((n) => n.id === card.dataset.id);
                if (note && (await removeNote(note))) renderList();
                return;
            }
            if (actionButton) {
                switch (actionButton.dataset.act) {
                    case 'close': dialog.close(); break;
                    case 'new': openEditor(null); break;
                    case 'back': leaveEditor(); break;
                    case 'trash': {
                        const note = current;
                        if (note && notes.includes(note) && (await removeNote(note))) { current = null; showList(); }
                        break;
                    }
                    default: break;
                }
                return;
            }
            if (card) {
                const note = notes.find((n) => n.id === card.dataset.id);
                if (note) openEditor(note);
            }
        });

        dialog.addEventListener('keydown', (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && event.target.classList && event.target.classList.contains('note-card')) {
                event.preventDefault();
                const note = notes.find((n) => n.id === event.target.dataset.id);
                if (note) openEditor(note);
            }
        });

        dialog.addEventListener('cancel', (event) => {
            if (!editorView.hidden) { event.preventDefault(); leaveEditor(); }
        });
        dialog.addEventListener('close', () => { if (current) { leaveEditor(); } });

        titleInput.addEventListener('input', () => {
            current.title = titleInput.value;
            save();
        });
        titleInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); body.focus(); }
        });

        body.addEventListener('compositionstart', () => { composing = true; });
        body.addEventListener('compositionend', () => { composing = false; });
        body.addEventListener('input', (event) => {
            current.body = readText();
            syncEmptyState();
            const type = event.inputType || '';
            const boundary = type === 'insertFromPaste' || type === 'insertParagraph' || type === 'insertLineBreak' || (event.data && /^\s$/.test(event.data));
            if (boundary && !composing) {
                linkify();
                current.body = readText();
            }
            save();
        });
        body.addEventListener('blur', () => {
            if (!current || composing) return;
            linkify();
            const text = readText();
            if (text === current.body) return;
            current.body = text;
            save();
        });

        const open = () => {
            current = null;
            showList();
            if (!dialog.open) dialog.showModal();
        };

        const createNote = (title, bodyText) => {
            const note = { id: uid(), title: String(title || ''), body: String(bodyText || ''), createdAt: Date.now(), updatedAt: Date.now() };
            if (!dialog.open) dialog.showModal();
            openEditor(note);
            save();
            return true;
        };

        notify();
        return { open, createNote, count: () => notes.length };
    };

    window.NotesApp = { init };
})();
