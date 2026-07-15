/*
 * Shared helpers used by every page: the repo the "Open submission issue"
 * links point at, the optional contest-window config for the home page
 * status readout, and small render utilities reused across pages.
 */
const REPO = { owner: 'VimukthiHerath', name: 'hackathon-portal' };

/*
 * Optional contest window for the home page countdown line.
 * Leave both as null until dates are locked in — the status readout
 * simply omits the countdown row rather than showing a made-up time.
 * Example: CONTEST_WINDOW = { start: '2026-08-01T09:00:00+05:30', end: '2026-08-01T21:00:00+05:30' };
 */
const CONTEST_WINDOW = { start: null, end: null };

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function issueUrl(question) {
  const params = new URLSearchParams({
    template: 'submit.yml',
    question_id: `${question.id}: ${question.title}`,
  });
  return `https://github.com/${REPO.owner}/${REPO.name}/issues/new?${params.toString()}`;
}

function newIssueUrl() {
  return `https://github.com/${REPO.owner}/${REPO.name}/issues/new?template=submit.yml`;
}

function teamNames(leaderboard) {
  return Object.keys(leaderboard).sort((a, b) => a.localeCompare(b));
}

function getMyTeam() {
  return localStorage.getItem('openhack.myTeam') || '';
}

function setMyTeam(name) {
  if (name) localStorage.setItem('openhack.myTeam', name);
  else localStorage.removeItem('openhack.myTeam');
}

function formatRelativeTime(date) {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return null;
  const totalSeconds = Math.floor(msRemaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
