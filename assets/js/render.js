const Render = (() => {
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    function statusBadge(status) {
        if (status === 'Disqualified') {
            return '<span class="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">Disqualified &#9888;&#65039;</span>';
        }
        if (status === 'Failed') {
            return '<span class="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">Failed</span>';
        }
        return '<span class="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Active</span>';
    }

    function questionCard(q) {
        if (!q.unlocked) {
            return `
                <div class="q-card bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 opacity-60 fade-in">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700">
                        <i class="fa-solid fa-lock mr-1"></i>Coming Soon
                    </span>
                    <h2 class="font-display text-xl font-black mt-3 text-slate-400">${escapeHtml(q.id)}: ${escapeHtml(q.title)}</h2>
                    <p class="text-slate-600 text-sm mt-2">This question isn't open for submissions yet.</p>
                </div>`;
        }
        return `
            <div class="q-card bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl fade-in">
                <span class="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Active &middot; ${escapeHtml(q.points)} pts</span>
                <h2 class="font-display text-xl font-black mt-3 text-slate-200">${escapeHtml(q.id)}: ${escapeHtml(q.title)}</h2>
                <p class="text-slate-400 text-sm mt-2 leading-relaxed">${escapeHtml(q.summary || '')}</p>
                <div class="mt-6 pt-6 border-t border-slate-800 space-y-2">
                    <a href="./questions/${encodeURIComponent(q.id)}/README.md" class="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition duration-200">
                        <i class="fa-solid fa-file-lines"></i><span>Read Problem Statement</span>
                    </a>
                    <a href="./${encodeURIComponent(q.id)}_Starter_Pack.zip" download class="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-bold py-2.5 px-4 rounded-xl shadow-lg transition duration-200 group">
                        <i class="fa-solid fa-cloud-arrow-down group-hover:animate-bounce"></i><span>Download Starter Pack</span>
                    </a>
                </div>
            </div>`;
    }

    function renderQuestions(questions) {
        const list = document.getElementById('question-list');
        if (!questions.length) {
            list.innerHTML = '<div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">No questions published yet.</div>';
            return;
        }
        list.innerHTML = questions.map(questionCard).join('');
    }

    function animateCount(el, target) {
        const duration = 600;
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function statTile(label, value) {
        return `
            <div class="bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-3 text-center min-w-[7rem] fade-in">
                <div class="stat-value text-2xl font-black text-amber-400" data-count="${value}">0</div>
                <div class="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">${label}</div>
            </div>`;
    }

    function renderStats(questions, leaderboard) {
        const unlocked = questions.filter(q => q.unlocked).length;
        const teams = Object.keys(leaderboard).length;
        const topScore = teams ? Math.max(...Object.values(leaderboard).map(t => t.total || 0)) : 0;

        const row = document.getElementById('stats-row');
        row.innerHTML =
            statTile('Questions Live', unlocked) +
            statTile('Teams Competing', teams) +
            statTile('Top Score', topScore);

        row.querySelectorAll('[data-count]').forEach(el => animateCount(el, Number(el.dataset.count)));
    }

    function leaderboardRow(team, index) {
        let rankBadge = `<span class="text-slate-500 font-mono">${index + 1}</span>`;
        if (index === 0 && team.total > 0) rankBadge = '<i class="fa-solid fa-trophy text-amber-400"></i>';
        if (index === 1 && team.total > 0) rankBadge = '<i class="fa-solid fa-trophy text-slate-300"></i>';
        if (index === 2 && team.total > 0) rankBadge = '<i class="fa-solid fa-trophy text-orange-600"></i>';

        const nameDisplay = team.disqualified
            ? `<span class="font-medium text-slate-500 line-through">${escapeHtml(team.name)}</span>`
            : `<span class="font-bold text-slate-200 text-base">${escapeHtml(team.name)}</span>`;

        const breakdown = Object.entries(team.questions).map(([qid, q]) => `
            <span class="inline-flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1 text-xs mr-2 mb-2">
                <span class="font-mono text-slate-400">${escapeHtml(qid)}</span>
                <span class="text-slate-200 font-semibold">${escapeHtml(q.score)}/${escapeHtml(q.points)}</span>
                ${statusBadge(q.status)}
            </span>`).join('') || '<span class="text-xs text-slate-600">No question attempts yet.</span>';

        return `
            <tr class="lb-row ${team.disqualified ? 'bg-rose-950/10 opacity-60' : ''}" data-toggle>
                <td class="py-4 px-6 text-center text-lg">${rankBadge}</td>
                <td class="py-4 px-6"><i class="fa-solid fa-chevron-right chevron text-slate-600 text-xs mr-2"></i>${nameDisplay}</td>
                <td class="py-4 px-6">${statusBadge(team.disqualified ? 'Disqualified' : 'Active')}</td>
                <td class="py-4 px-6 text-right font-mono font-bold text-lg text-amber-400">${team.total} <span class="text-xs text-slate-500 font-normal">pts</span></td>
            </tr>
            <tr class="bg-slate-950/40">
                <td colspan="4" class="px-6">
                    <div class="detail-wrap">
                        <div class="detail-inner py-0"><div class="pb-4">${breakdown}</div></div>
                    </div>
                </td>
            </tr>`;
    }

    function renderLeaderboard(leaderboard) {
        const teams = Object.entries(leaderboard).map(([name, data]) => ({
            name,
            total: data.total || 0,
            questions: data.questions || {},
            disqualified: Object.values(data.questions || {}).some(q => q.status === 'Disqualified'),
        }));
        teams.sort((a, b) => b.total - a.total);

        const container = document.getElementById('board-container');
        if (!teams.length) {
            container.innerHTML = '<div class="p-12 text-center text-slate-500">No submissions yet — be the first!</div>';
            return;
        }

        let html = '<div class="overflow-x-auto"><table class="w-full text-left border-collapse">';
        html += '<thead><tr class="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-800/50">' +
            '<th class="py-4 px-6 w-16">Rank</th><th class="py-4 px-6">Team</th><th class="py-4 px-6">Status</th><th class="py-4 px-6 text-right">Total</th></tr></thead>';
        html += '<tbody class="divide-y divide-slate-800/60">';
        html += teams.map(leaderboardRow).join('');
        html += '</tbody></table></div>';

        container.innerHTML = html;
        container.querySelectorAll('tr[data-toggle]').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('is-open');
                row.nextElementSibling.querySelector('.detail-wrap').classList.toggle('is-open');
            });
        });
    }

    function renderError(message) {
        document.getElementById('board-container').innerHTML = `
            <div class="p-8 text-center text-rose-400">
                <i class="fa-solid fa-circle-exclamation text-3xl mb-2"></i>
                <p class="font-bold">Dashboard Connection Failure</p>
                <p class="text-xs text-slate-500 mt-1">${escapeHtml(message)}</p>
            </div>`;
    }

    return { renderQuestions, renderStats, renderLeaderboard, renderError };
})();
