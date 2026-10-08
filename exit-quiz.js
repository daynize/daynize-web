/* 이탈 방지 퀴즈 모달 공통 모듈 (index.html, courses/speaking/index.html)
 * 항목 형식: { id, title, keyPhrase, explanation } */
(() => {
    'use strict';

    const MODAL_HTML = `
<dialog id="exit-quiz-modal" aria-labelledby="exit-quiz-title">
    <div class="quiz-body">
        <button type="button" class="quiz-close" aria-label="퀴즈 닫기">×</button>
        <h2 id="exit-quiz-title">🚨 인생이나 영어나 한 번 보고 어찌 알겠소? 문제 풀고 갑시다!</h2>
        <p class="quiz-sub">딱 2문제입니다. 천천히 골라 보세요.</p>
        <div class="quiz-list"></div>
        <div class="quiz-feedback quiz-summary" role="status" aria-live="polite" hidden></div>
        <div class="quiz-actions">
            <button type="button" class="quiz-btn quiz-rewatch" hidden>🎬 영상을 다시 보셔야겠군요!</button>
            <button type="button" class="quiz-btn secondary quiz-next" hidden>계속 이동하기 →</button>
        </div>
    </div>
</dialog>`;

    const shuffle = (list) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
    const distinct = (values, correct, count = 3) => shuffle([...new Set(values)].filter((v) => v && v !== correct)).slice(0, count);
    const wordsOf = (phrase) => phrase.match(/[A-Za-z']+/g) || [];
    const fallbackWords = ['have', 'make', 'take', 'give', 'want', 'need', 'that', 'with', 'them', 'very'];

    // 두 페이지가 공유하는 4가지 출제 유형
    const TYPES = [
        {
            id: 'meaning', label: '핵심 의미',
            variants: () => ['m'],
            make: (item, _variant, all) => {
                const wrong = distinct(all.map((i) => i.explanation), item.explanation);
                if (wrong.length < 3) return null;
                return { prompt: pickRandom(['이 문장이 담고 있는 의미로 알맞은 것은?', '다음 문장을 가장 잘 설명한 것은?', '이 표현의 핵심은 무엇일까요?']), quote: item.keyPhrase, correct: item.explanation, wrong };
            }
        },
        {
            id: 'blank', label: '빈칸 채우기',
            variants: (item) => wordsOf(item.keyPhrase).map((w, i) => (w.length >= 3 ? `w${i}` : null)).filter(Boolean),
            make: (item, variant, all) => {
                const index = Number(variant.slice(1));
                const correct = wordsOf(item.keyPhrase)[index];
                let count = 0;
                const quote = item.keyPhrase.replace(/[A-Za-z']+/g, (w) => (count++ === index ? '____' : w));
                const pool = all.flatMap((i) => wordsOf(i.keyPhrase)).filter((w) => w.length >= 3).map((w) => w.toLowerCase());
                let wrong = distinct(pool, correct.toLowerCase());
                if (wrong.length < 3) wrong = distinct([...pool, ...fallbackWords], correct.toLowerCase());
                if (/^[A-Z]/.test(correct)) wrong = wrong.map((w) => w[0].toUpperCase() + w.slice(1));
                return { prompt: pickRandom(['빈칸에 들어갈 알맞은 말은?', '문장을 완성해 보세요!', '비어 있는 단어를 채워 주세요.']), quote, correct, wrong };
            }
        },
        {
            id: 'situation', label: '상황에 맞는 표현',
            variants: () => ['s'],
            make: (item, _variant, all) => {
                const wrong = distinct(all.map((i) => i.keyPhrase), item.keyPhrase);
                if (wrong.length < 3) return null;
                return { prompt: pickRandom(['이런 상황에서 쓰기 좋은 표현은?', '다음 설명에 딱 맞는 문장을 고르세요.', '이럴 때 영어로 뭐라고 할까요?']), quote: item.explanation, correct: item.keyPhrase, wrong };
            }
        },
        {
            id: 'title', label: '강의 찾기',
            variants: (item) => (item.title && item.title !== item.keyPhrase ? ['t'] : []),
            make: (item, _variant, all) => {
                const wrong = distinct(all.map((i) => i.title), item.title);
                if (wrong.length < 3) return null;
                return { prompt: pickRandom(['이 문장은 어떤 강의에서 배웠을까요?', '이 표현이 나온 강의를 찾아보세요.', '이 문장과 가장 관련 깊은 강의는?']), quote: item.keyPhrase, correct: item.title, wrong };
            }
        }
    ];

    const init = (options) => {
        const { getItems, triggerSelector, ignoreSelector = '', storageKey = 'exitQuizUsed', onRewatch, defaultId = 'care' } = options;
        document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
        const modal = document.getElementById('exit-quiz-modal');
        const list = modal.querySelector('.quiz-list');
        const summary = modal.querySelector('.quiz-summary');
        const nextButton = modal.querySelector('.quiz-next');
        const rewatchButton = modal.querySelector('.quiz-rewatch');

        const watchedList = [];
        let hasWatchedAny = false;
        let pendingAction = null;
        let wrongItems = [];

        const markWatched = (id) => {
            if (id && !watchedList.includes(id)) watchedList.push(id);
            hasWatchedAny = true;
        };
        const readUsed = () => { try { return JSON.parse(sessionStorage.getItem(storageKey)) || []; } catch (_) { return []; } };
        const writeUsed = (used) => { try { sessionStorage.setItem(storageKey, JSON.stringify(used)); } catch (_) { } };

        const buildQuestions = () => {
            const all = getItems().filter((i) => i.keyPhrase && i.explanation);
            if (all.length < 4) return null;
            let watched = all.filter((i) => watchedList.includes(i.id));
            if (!watched.length) watched = all.filter((i) => i.id === defaultId).concat(all).slice(0, 1);
            const candidates = watched.flatMap((item) => TYPES.flatMap((type) => type.variants(item)
                .map((variant) => ({ item, type, variant, key: `${item.id}|${type.id}|${variant}` })))).filter((c) => c.type.make(c.item, c.variant, all));
            const choose = (used) => {
                const fresh = shuffle(candidates.filter((c) => !used.includes(c.key)));
                const picked = [];
                fresh.forEach((c) => { if (picked.length < 2 && !picked.some((p) => p.item === c.item)) picked.push(c); });
                fresh.forEach((c) => { if (picked.length < 2 && !picked.includes(c) && !picked.some((p) => p.type === c.type)) picked.push(c); });
                fresh.forEach((c) => { if (picked.length < 2 && !picked.includes(c)) picked.push(c); });
                return picked;
            };
            let used = readUsed();
            let picked = choose(used);
            if (picked.length < 2) { used = []; picked = choose(used); }
            if (picked.length < 2) return null;
            writeUsed([...used, ...picked.map((c) => c.key)]);
            return picked.map((c) => ({ ...c.type.make(c.item, c.variant, all), item: c.item, typeLabel: c.type.label }));
        };

        const launchConfetti = () => {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const layer = document.createElement('div');
            layer.className = 'quiz-confetti';
            const colors = ['#345d4d', '#b68b4c', '#e7b84f', '#6fa58e', '#c2553f'];
            for (let i = 0; i < 36; i++) {
                const piece = document.createElement('i');
                piece.style.left = `${Math.random() * 100}%`;
                piece.style.background = colors[i % colors.length];
                piece.style.animationDelay = `${Math.random() * .4}s`;
                layer.append(piece);
            }
            modal.append(layer);
            setTimeout(() => layer.remove(), 2400);
        };

        const renderExitQuizModal = (questions) => {
            list.replaceChildren();
            summary.hidden = true;
            nextButton.hidden = true;
            rewatchButton.hidden = true;
            wrongItems = [];
            let answered = 0;
            questions.forEach((q, qi) => {
                const block = document.createElement('section');
                block.className = 'quiz-item';
                const box = document.createElement('div');
                box.className = 'quiz-question';
                const small = document.createElement('small');
                small.textContent = `문제 ${qi + 1} · ${q.typeLabel} — ${q.prompt}`;
                box.append(small, document.createTextNode(q.quote));
                const options = document.createElement('ul');
                options.className = 'quiz-options';
                const feedback = document.createElement('div');
                feedback.hidden = true;
                shuffle([{ text: q.correct, ok: true }, ...q.wrong.map((text) => ({ text, ok: false }))]).forEach((choice, i) => {
                    const li = document.createElement('li');
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'quiz-option';
                    button.textContent = `${i + 1}. ${choice.text}`;
                    button.dataset.ok = choice.ok ? '1' : '0';
                    button.addEventListener('click', () => {
                        options.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.dataset.ok === '1') b.classList.add('is-correct'); });
                        if (choice.ok) {
                            feedback.className = 'quiz-feedback is-correct';
                            feedback.textContent = '🎉 정답이에요! 잘 기억하고 계시네요.';
                        } else {
                            button.classList.add('is-wrong');
                            wrongItems.push(q.item);
                            feedback.className = 'quiz-feedback is-wrong';
                            feedback.textContent = `아쉬워요! 정답은 “${q.correct}”입니다. ${q.item.keyPhrase} — ${q.item.explanation}`;
                        }
                        feedback.hidden = false;
                        if (++answered < questions.length) return;
                        nextButton.hidden = false;
                        summary.hidden = false;
                        if (wrongItems.length) {
                            summary.className = 'quiz-feedback quiz-summary is-wrong';
                            summary.textContent = `${questions.length}문제 중 ${questions.length - wrongItems.length}문제 정답! 틀린 부분은 영상으로 한 번 더 확인해 보세요.`;
                            rewatchButton.hidden = false;
                        } else {
                            summary.className = 'quiz-feedback quiz-summary is-correct';
                            summary.textContent = '👏 두 문제 모두 정답! 이 정도면 한 번 보고도 아시는 분이네요.';
                            launchConfetti();
                        }
                    });
                    li.append(button);
                    options.append(li);
                });
                block.append(box, options, feedback);
                list.append(block);
            });
        };

        const showExitQuizModal = (action) => {
            if (modal.open) return false;
            if (!watchedList.length) markWatched(defaultId);
            const questions = buildQuestions();
            if (!questions) {
                console.warn('퀴즈를 만들 수 없습니다. 강의 데이터가 로딩되었는지 확인하세요.');
                return false;
            }
            pendingAction = typeof action === 'function' ? action : null;
            renderExitQuizModal(questions);
            modal.showModal();
            modal.scrollTop = 0;
            return true;
        };

        modal.addEventListener('close', () => {
            const action = pendingAction;
            pendingAction = null;
            if (action) action();
        });
        modal.querySelector('.quiz-close').addEventListener('click', () => modal.close());
        nextButton.addEventListener('click', () => modal.close());
        rewatchButton.addEventListener('click', () => {
            const item = wrongItems[0];
            pendingAction = null;
            modal.close();
            if (item && onRewatch) onRewatch(item);
        });

        let bypass = false;
        document.addEventListener('click', (event) => {
            if (bypass || !hasWatchedAny || event.target.closest('#exit-quiz-modal')) return;
            if (ignoreSelector && event.target.closest(ignoreSelector)) return;
            const trigger = event.target.closest(triggerSelector);
            if (!trigger) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const proceed = () => { bypass = true; try { trigger.click(); } finally { bypass = false; } };
            if (!showExitQuizModal(proceed)) proceed();
        }, true);

        let lastAuto = 0;
        document.documentElement.addEventListener('mouseleave', (event) => {
            if (event.clientY > 0 || !hasWatchedAny || Date.now() - lastAuto < 30000) return;
            if (showExitQuizModal(null)) lastAuto = Date.now();
        });

        // 뒤로가기 한 번을 가로채 퀴즈를 띄우고, 진행 시 가드 항목까지 건너뛴다.
        let leaving = false;
        history.pushState({ exitGuard: true }, '');
        window.addEventListener('popstate', () => {
            if (leaving) return;
            if (!hasWatchedAny) { leaving = true; history.back(); return; }
            history.pushState({ exitGuard: true }, '');
            showExitQuizModal(() => { leaving = true; history.go(-2); });
        });

        window.showExitQuizModal = showExitQuizModal;
        return { markWatched, watchedList, show: showExitQuizModal };
    };

    window.ExitQuiz = { init };
})();
