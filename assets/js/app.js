const REFRESH_MS = 30000;

async function loadDashboard() {
    try {
        const [questions, leaderboard] = await Promise.all([
            Api.getQuestions(),
            Api.getLeaderboard(),
        ]);
        Render.renderQuestions(questions);
        Render.renderStats(questions, leaderboard);
        Render.renderLeaderboard(leaderboard);
        document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
    } catch (err) {
        Render.renderError(err.message);
    }
}

loadDashboard();
setInterval(loadDashboard, REFRESH_MS);
