(() => {
  const REFRESH_MS = 30000;
  let lastFetched = null;

  function statusBadge(status) {
    if (status === 'Disqualified') return '<span class="badge badge-disqualified">Disqualified</span>';
    if (status === 'Failed') return '<span class="badge badge-failed">Failed</span>';
    return '<span class="badge badge-unlocked">Active</span>';
  }

  function assignRanks(teams) {
    let rank = 0;
    let prevScore = null;
    teams.forEach((team, i) => {
      if (team.total !== prevScore) rank = i + 1;
      team.rank = rank;
      prevScore = team.total;
    });
  }

  function chipRow(qid, q) {
    return `<span class="lb-chip"><span class="qid">${escapeHtml(qid)}</span><span>${escapeHtml(q.score)}/${escapeHtml(q.points)}</span>${statusBadge(q.status)}</span>`;
  }

  function leaderboardRow(team, index) {
    const solvedCount = Object.values(team.questions).filter(q => q.status === 'Active' && Number(q.score) > 0).length;
    const totalCount = Object.keys(team.questions).length;
    const breakdown = Object.entries(team.questions).map(([qid, q]) => chipRow(qid, q)).join('')
      || '<span style="color: var(--ink-soft); font-size: 0.8rem;">No submissions yet.</span>';

    const rowClasses = ['lb-row'];
    if (team.rank === 1 && team.total > 0) rowClasses.push('is-top');
    if (team.disqualified) rowClasses.push('is-disqualified');

    return `
      <tr class="${rowClasses.join(' ')}" data-toggle tabindex="0">
        <td class="lb-rank">${team.rank}</td>
        <td class="lb-team">${escapeHtml(team.name)}<span class="toggle-hint">details &#8250;</span></td>
        <td class="lb-solved">${solvedCount} / ${totalCount} solved</td>
        <td class="lb-score">${team.total}<span class="unit">pts</span></td>
      </tr>
      <tr class="lb-detail">
        <td colspan="4">
          <div class="lb-detail-inner"><div class="lb-detail-content"><div>${breakdown}</div></div></div>
        </td>
      </tr>`;
  }

  function render(leaderboard) {
    const teams = Object.entries(leaderboard).map(([name, data]) => ({
      name,
      total: data.total || 0,
      questions: data.questions || {},
      disqualified: Object.values(data.questions || {}).some(q => q.status === 'Disqualified'),
    }));
    teams.sort((a, b) => b.total - a.total);
    assignRanks(teams);

    const container = document.getElementById('board-container');
    if (!teams.length) {
      container.innerHTML = '<div class="lb-table-wrap"><div class="lb-empty">No submissions yet — be the first to score.</div></div>';
      return;
    }

    let html = '<div class="lb-table-wrap"><table class="lb-table">';
    html += '<thead><tr><th>Rank</th><th>Team</th><th>Solved</th><th class="num">Score</th></tr></thead><tbody>';
    html += teams.map(leaderboardRow).join('');
    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('tr[data-toggle]').forEach(row => {
      const toggle = () => {
        const detail = row.nextElementSibling.querySelector('.lb-detail-inner');
        detail.classList.toggle('is-open');
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  function renderError(message) {
    document.getElementById('board-container').innerHTML =
      `<div class="callout callout-error">Couldn't load the leaderboard: ${escapeHtml(message)}</div>`;
  }

  function tickUpdatedLabel() {
    const el = document.getElementById('last-updated');
    if (lastFetched) el.textContent = `updated ${formatRelativeTime(lastFetched)}`;
  }

  async function load() {
    try {
      const leaderboard = await Api.getLeaderboard();
      render(leaderboard);
      lastFetched = new Date();
      tickUpdatedLabel();
    } catch (err) {
      renderError(err.message);
    }
  }

  load();
  setInterval(load, REFRESH_MS);
  setInterval(tickUpdatedLabel, 5000);
})();
