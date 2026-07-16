(() => {
  const REFRESH_MS = 30000;
  let allQuestions = [];
  let allLeaderboard = {};
  let teamPickerWired = false;

  function isSolvedByTeam(qid, team) {
    if (!team || !allLeaderboard[team]) return false;
    const entry = allLeaderboard[team].questions && allLeaderboard[team].questions[qid];
    return !!entry && entry.status === 'Active' && Number(entry.score) > 0;
  }

  function questionRow(q, myTeam) {
    if (!q.unlocked) {
      return `
        <div class="q-row is-locked">
          <span class="glyph glyph-locked" aria-hidden="true">&#9675;</span>
          <div>
            <div class="q-heading">
              <span class="q-id">${escapeHtml(q.id)}</span>
              <span class="q-title">${escapeHtml(q.title)}</span>
              <span class="badge badge-locked">Locked</span>
            </div>
            <p class="q-summary">Releases live during the event — check back here, no need to refresh.</p>
          </div>
        </div>`;
    }

    const solved = isSolvedByTeam(q.id, myTeam);
    const glyph = solved
      ? '<span class="glyph glyph-solved" aria-hidden="true">&#10003;</span>'
      : '<span class="glyph glyph-unlocked" aria-hidden="true">&#9679;</span>';
    const statusBadge = solved
      ? '<span class="badge badge-solved">Solved by you</span>'
      : `<span class="badge badge-points">${escapeHtml(q.points)} pts</span>`;

    return `
      <div class="q-row">
        ${glyph}
        <div>
          <div class="q-heading">
            <span class="q-id">${escapeHtml(q.id)}</span>
            <span class="q-title">${escapeHtml(q.title)}</span>
            ${statusBadge}
          </div>
          <p class="q-summary">${escapeHtml(q.summary || '')}</p>
        </div>
        <div class="q-actions">
          <a class="btn btn-outline" href="questions/${encodeURIComponent(q.id)}/README.md">Read problem</a>
          <a class="btn btn-fill" href="${encodeURIComponent(q.id)}_Starter_Pack.zip" download>Download starter</a>
          <a class="q-link" href="submit.html">How to submit &rarr;</a>
        </div>
      </div>`;
  }

  function renderList() {
    const myTeam = getMyTeam();
    const list = document.getElementById('question-list');
    if (!allQuestions.length) {
      list.innerHTML = '<div class="q-empty">No questions published yet.</div>';
      return;
    }
    list.innerHTML = allQuestions.map(q => questionRow(q, myTeam)).join('');
  }

  function populateTeamPicker() {
    const select = document.getElementById('team-select');
    const names = teamNames(allLeaderboard);

    // Rebuild rather than append — this runs on every auto-refresh, and
    // appending would duplicate every option on each pass.
    select.innerHTML = '<option value="">— pick your team —</option>'
      + names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');

    const saved = getMyTeam();
    if (saved && names.includes(saved)) select.value = saved;

    if (!teamPickerWired) {
      select.addEventListener('change', () => {
        setMyTeam(select.value);
        renderList();
      });
      teamPickerWired = true;
    }
  }

  function renderError(message) {
    document.getElementById('question-list').innerHTML =
      `<div class="callout callout-error">Couldn't load questions: ${escapeHtml(message)}</div>`;
  }

  async function load() {
    try {
      const [questions, leaderboard] = await Promise.all([Api.getQuestions(), Api.getLeaderboard()]);
      allQuestions = questions;
      allLeaderboard = leaderboard;
      populateTeamPicker();
      renderList();
    } catch (err) {
      renderError(err.message);
    }
  }

  load();
  setInterval(load, REFRESH_MS);
})();
