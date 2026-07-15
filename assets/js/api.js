const Api = (() => {
  function cacheBust() {
    return '?v=' + Date.now();
  }

  async function fetchJson(path) {
    const res = await fetch(path + cacheBust());
    if (!res.ok) throw new Error(`${path} unavailable (HTTP ${res.status})`);
    return res.json();
  }

  async function getQuestions() {
    const questions = await fetchJson('questions.json');
    questions.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return questions;
  }

  async function getLeaderboard() {
    return fetchJson('leaderboard.json');
  }

  return { getQuestions, getLeaderboard };
})();
