(() => {
  const REFRESH_MS = 30000;
  let countdownTimer = null;

  function renderTerminal(questions, leaderboard) {
    const unlocked = questions.filter(q => q.unlocked).length;
    const teams = Object.keys(leaderboard).length;
    const phase = unlocked > 0 ? 'LIVE' : 'NOT STARTED';

    const el = document.getElementById('status-terminal');
    el.innerHTML = `
      <div class="terminal-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span>status</span>
      </div>
      <div class="terminal-body">
        <div class="prompt-line">open-hack status<span class="cursor" aria-hidden="true"></span></div>
        <div class="terminal-row"><span class="key">phase</span><span class="val accent">${escapeHtml(phase)}</span></div>
        <div class="terminal-row"><span class="key">unlocked</span><span class="val">${unlocked} / ${questions.length} questions</span></div>
        <div class="terminal-row"><span class="key">teams</span><span class="val">${teams} registered</span></div>
        <div class="terminal-row" id="countdown-row" hidden><span class="key">ends in</span><span class="val accent" id="countdown-val"></span></div>
      </div>`;

    if (CONTEST_WINDOW.end) {
      const row = document.getElementById('countdown-row');
      const val = document.getElementById('countdown-val');
      row.hidden = false;
      if (countdownTimer) clearInterval(countdownTimer);
      const tick = () => {
        const remaining = new Date(CONTEST_WINDOW.end).getTime() - Date.now();
        const formatted = formatCountdown(remaining);
        val.textContent = formatted || 'ended';
        if (!formatted && countdownTimer) clearInterval(countdownTimer);
      };
      tick();
      countdownTimer = setInterval(tick, 1000);
    }
  }

  function renderError(message) {
    document.getElementById('status-terminal').innerHTML = `
      <div class="terminal-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span>status</span></div>
      <div class="terminal-body"><div class="prompt-line">open-hack status</div>
      <p style="color: #f0b27a; margin: 0;">Couldn't reach the data files: ${escapeHtml(message)}</p></div>`;
  }

  async function load() {
    try {
      const [questions, leaderboard] = await Promise.all([Api.getQuestions(), Api.getLeaderboard()]);
      renderTerminal(questions, leaderboard);
    } catch (err) {
      renderError(err.message);
    }
  }

  load();
  setInterval(load, REFRESH_MS);
})();
