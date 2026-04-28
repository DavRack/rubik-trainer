<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ollCases, type OLLCase } from '$lib/data/oll';
  import { stats, rateCase, removeResult, clearAllStats, getRetrievability } from '$lib/stores/stats';
  import Cube from '$lib/components/Cube.svelte';
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import type { Grade } from '$lib/fsrs';

  let selectedIds: number[] = [];
  let currentCase: OLLCase | null = null;
  let lastCaseId: number | null = null;
  let showCase = false;
  
  let timerState: 'idle' | 'holding' | 'ready' | 'running' | 'finished' = 'idle';
  let startTime = 0;
  let currentTime = 0;
  let interval: any;
  let holdTimeout: any;
  let lastTime: number | null = null;
  let lastGrade: Grade | null = null;
  let lastScore: number | null = null;
  let canContinue = false;

  onMount(() => {
    const saved = localStorage.getItem('selected-oll');
    if (saved) {
      selectedIds = JSON.parse(saved);
      nextCase();
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
      clearTimeout(holdTimeout);
    }
  });

  function nextCase() {
    if (selectedIds.length === 0) return;

    if (currentCase) {
      lastCaseId = currentCase.id;
    }

    lastGrade = null;
    lastScore = null;
    timerState = 'idle';
    currentTime = 0;
    showCase = false;
    canContinue = false;
    clearTimeout(holdTimeout);

    // FSRS Selection Logic
    // 1. Prioritize cases that have never been seen
    // 2. Among seen cases, pick the one with lowest retrievability
    
    const seen = selectedIds.filter(id => $stats[id]);
    const unseen = selectedIds.filter(id => !$stats[id]);

    let selectedId: number;

    if (unseen.length > 0) {
      selectedId = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
      // Pick based on retrievability
      const sortedByDue = seen.map(id => {
        const data = $stats[id]!;
        const r = data.fsrs ? getRetrievability(data.fsrs.stability, data.fsrs.last_review!) : 0;
        return { id, r };
      }).sort((a, b) => a.r - b.r);
      
      selectedId = sortedByDue[0].id;
    }

    currentCase = ollCases.find(c => c.id === selectedId) || null;
  }

  function getMedian(times: number[]): number {
    if (times.length === 0) return 0;
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }


  $: globalBestMedian = (() => {
    let minMedian = Infinity;
    Object.values($stats).forEach(data => {
      const last5 = data.results.filter(r => r.time > 0).slice(-5).map(r => r.time);
      if (last5.length > 0) {
        const m = getMedian(last5);
        if (m < minMedian) minMedian = m;
      }
    });
    return minMedian === Infinity ? 1.0 : minMedian;
  })();

  function getCalculatedGrade(ollCase: OLLCase, time: number): { grade: Grade, score: number } {
    const score = globalBestMedian / time; 
    
    let grade: Grade;
    if (score >= 0.90) grade = 4;
    else if (score >= 0.60) grade = 3;
    else grade = 2;

    return { grade, score };
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (timerState === 'running') {
      e.preventDefault();
      stopTimer(false);
      return;
    }

    if (timerState === 'finished') {
      if ((e.code === 'Space' || e.key === 'Enter') && canContinue) {
        e.preventDefault();
        nextCase();
      }
      if (e.code === 'Backspace') {
        e.preventDefault();
        if (currentCase && lastGrade !== 1) {
          rateCase(currentCase.id, 0, 1);
          lastGrade = 1;
          lastScore = 0;
        }
      }
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'idle') {
        timerState = 'holding';
        clearTimeout(holdTimeout);
        holdTimeout = setTimeout(() => {
          if (timerState === 'holding') {
            timerState = 'ready';
          }
        }, 500);
      }
    } else if (e.code === 'Backspace') {
      e.preventDefault();
      if (timerState === 'idle' || timerState === 'finished') {
        if (currentCase) stopTimer(true);
      }
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'ready') {
        startTimer();
      } else if (timerState === 'holding') {
        clearTimeout(holdTimeout);
        timerState = 'idle';
      }
    }
  }

  function startTimer() {
    timerState = 'running';
    startTime = Date.now();
    interval = setInterval(() => {
      currentTime = (Date.now() - startTime) / 1000;
    }, 10);
  }

  function stopTimer(isDNF = false) {
    clearInterval(interval);
    const finalTime = isDNF ? 0 : (Date.now() - startTime) / 1000;
    currentTime = finalTime;
    lastTime = finalTime;
    timerState = 'finished';
    showCase = true;
    canContinue = false;

    if (currentCase) {
      if (isDNF) {
        lastGrade = 1;
        lastScore = 0;
      } else {
        const result = getCalculatedGrade(currentCase, finalTime);
        lastGrade = result.grade;
        lastScore = result.score;
      }
      rateCase(currentCase.id, finalTime, lastGrade);
    }

    setTimeout(() => {
      canContinue = true;
    }, 1000);
  }

  function handleRate(grade: Grade) {
    if (!currentCase) return;
    rateCase(currentCase.id, currentTime, grade);
    nextCase();
  }

  function formatTime(t: number) {
    return t.toFixed(2);
  }

  $: sortedSummary = selectedIds
    .map(id => {
      const c = ollCases.find(caseItem => caseItem.id === id);
      const caseData = $stats[id];
      const fsrs = caseData?.fsrs;
      const r = fsrs ? getRetrievability(fsrs.stability, fsrs.last_review!) : 1;
      return {
        id,
        name: c?.name || "Unknown",
        svg: c?.svg,
        results: caseData?.results || [],
        stability: fsrs?.stability || 0,
        retrievability: r
      };
    })
    .sort((a, b) => a.retrievability - b.retrievability);

  let statsCaseId: number | null = null;
  $: statsCase = statsCaseId ? ollCases.find(c => c.id === statsCaseId) : null;
  $: statsData = statsCaseId ? $stats[statsCaseId] : null;

  let activeInfo: string | null = null;
  let sessionStartTime = Date.now();

  onMount(() => {
    const savedOll = localStorage.getItem('selected-oll');
    if (savedOll) {
      selectedIds = JSON.parse(savedOll);
      nextCase();
    }

    // Session Persistence Logic
    const savedSessionStart = localStorage.getItem('session-start-time');
    const allResults = Object.values($stats).flatMap(s => s.results);
    const lastResultTimestamp = allResults.length > 0 
      ? Math.max(...allResults.map(r => r.timestamp)) 
      : 0;

    const eightHours = 8 * 60 * 60 * 1000;
    const now = Date.now();

    if (savedSessionStart) {
      const startTime = parseInt(savedSessionStart);
      // If last solve was more than 8 hours ago, or session start is clearly invalid, reset
      if (now - lastResultTimestamp > eightHours) {
        resetSession();
      } else {
        sessionStartTime = startTime;
      }
    } else {
      resetSession();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  function resetSession() {
    sessionStartTime = Date.now();
    localStorage.setItem('session-start-time', sessionStartTime.toString());
  }

  $: sessionStats = (() => {
    const sessionResults = Object.values($stats).flatMap(s => 
      s.results.filter(r => r.timestamp > sessionStartTime)
    );
    
    if (sessionResults.length === 0) return null;

    const validSolves = sessionResults.filter(r => r.grade > 1);
    const avgTime = validSolves.reduce((acc, r) => acc + r.time, 0) / (validSolves.length || 1);
    const bestTime = validSolves.length > 0 ? Math.min(...validSolves.map(r => r.time)) : 0;

    const gradeCounts = {
      1: sessionResults.filter(r => r.grade === 1).length,
      2: sessionResults.filter(r => r.grade === 2).length,
      3: sessionResults.filter(r => r.grade === 3).length,
      4: sessionResults.filter(r => r.grade === 4).length,
    };

    const memorizedCount = Object.keys($stats).length;

    return {
      count: sessionResults.length,
      dnfs: gradeCounts[1],
      avgTime: avgTime,
      bestTime: bestTime,
      grades: gradeCounts,
      memorized: memorizedCount
    };
  })();

  function toggleInfo(name: string) {
    activeInfo = activeInfo === name ? null : name;
  }

  const infoDescriptions: Record<string, string> = {
    Stability: "Estimated time (in days) for recall probability to drop to 90%. Higher means you will remember it for longer.",
    Difficulty: "A measure of how hard this case is to remember (1-10). The higher it is, the more frequently you will see it.",
    Retrievability: "The current estimated probability (0-100%) that you will remember this case correctly right now."
  };

  function closeStats() {
    statsCaseId = null;
    activeInfo = null;
  }

  function getGradeLabel(grade: Grade) {
    const labels = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
    return labels[grade];
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }
</script>

<div class="layout">
  <main>
    {#if selectedIds.length === 0}
      <div class="msg">No cases selected. <a href="{base}/oll">Go select some</a>.</div>
    {:else if currentCase}
      <div class="scramble">{currentCase.setup}</div>
      
      <div class="display">
        <div class="case-preview-container" class:blurred={!showCase} on:click={() => showCase = true}>
          <Cube svg={currentCase.svg} size={250} />
          {#if !showCase}
            <div class="reveal-overlay">
              {currentCase.id === lastCaseId ? 'Try again' : 'Click to reveal case'}
            </div>
          {/if}
        </div>
        <div class="timer" 
             class:holding={timerState === 'holding'} 
             class:ready={timerState === 'ready'} 
             class:running={timerState === 'running'}>
          {formatTime(currentTime)}
        </div>
      </div>

      {#if timerState === 'finished'}
        <div class="rating-display">
          <div class="score-row">
            <div class="grade-badge grade-{lastGrade}">
              {lastGrade === 1 ? 'DNF' : getGradeLabel(lastGrade || 3)}
            </div>
            {#if lastScore !== null && currentCase}
              <div class="score-details">
                <div class="performance-score" title="Performance relative to your fastest OLL case (Median of last 5: {globalBestMedian.toFixed(2)}s)">
                  {(lastScore * 100).toFixed(0)}%
                </div>
                <div class="vs-avg-label">vs. absolute best</div>
              </div>
            {/if}
          </div>
          <p class="next-hint" style="opacity: {canContinue ? 1 : 0.3}; transition: opacity 0.2s;">
            Press <strong>Space</strong> for next, <strong>Backspace</strong> for DNF
          </p>
        </div>
      {:else}
        <div class="hints">
          <p>Press <strong>Space</strong> to {timerState === 'idle' ? 'start' : 'stop'}</p>
          <p>Press <strong>Backspace</strong> to DNF</p>
        </div>
      {/if}

      <div class="case-info" class:blurred={!showCase}>
        <h2>{currentCase.name} ({currentCase.subgroup})</h2>
        <p class="std-alg">Alg: {currentCase.standard_alg}</p>
      </div>
    {/if}
  </main>

  <aside class="sidebar">
    {#if sessionStats}
      <section class="session-stats">
        <div class="session-header">
          <div class="session-title">
            <h3>Session Stats</h3>
            <button class="reset-link" on:click={resetSession}>Reset</button>
          </div>
          <span class="memorized-count" title="Total cases with at least one solve">{sessionStats.memorized}/57 Memorized</span>
        </div>
        <div class="session-grid">
          <div class="session-box">
            <span class="label">Solves</span>
            <span class="value">{sessionStats.count}</span>
          </div>
          <div class="session-box">
            <span class="label">Avg Time</span>
            <span class="value">{sessionStats.avgTime.toFixed(2)}s</span>
          </div>
          <div class="session-box">
            <span class="label">Best Time</span>
            <span class="value" style="color: var(--primary-color)">{sessionStats.bestTime.toFixed(2)}s</span>
          </div>
        </div>

        <div class="grade-breakdown">
          <div class="grade-bar dnf" title="DNF: {sessionStats.grades[1]}" style="flex: {sessionStats.grades[1]}"></div>
          <div class="grade-bar hard" title="Hard: {sessionStats.grades[2]}" style="flex: {sessionStats.grades[2]}"></div>
          <div class="grade-bar good" title="Good: {sessionStats.grades[3]}" style="flex: {sessionStats.grades[3]}"></div>
          <div class="grade-bar easy" title="Easy: {sessionStats.grades[4]}" style="flex: {sessionStats.grades[4]}"></div>
        </div>
        <div class="grade-labels">
          <span>{sessionStats.grades[1]} DNF</span>
          <span>{sessionStats.grades[2]} H</span>
          <span>{sessionStats.grades[3]} G</span>
          <span>{sessionStats.grades[4]} E</span>
        </div>
      </section>
    {/if}

    <section class="summary">
      <div class="summary-header">
        <h3>Spaced Repetition</h3>
        <button class="clear-btn" on:click={() => { if(confirm('Clear all session data?')) clearAllStats(); }}>Clear All</button>
      </div>
      <div class="summary-list">
        {#each sortedSummary as item}
          <div class="summary-item" on:click={() => statsCaseId = item.id}>
            <Cube svg={item.svg} size={40} />
            <div class="item-info">
              <div class="item-header">
                <span class="item-id">#{item.id}</span>
                <span class="item-name">{item.name}</span>
                <span class="item-r" title="Retrievability">{(item.retrievability * 100).toFixed(0)}%</span>
              </div>
              <div class="item-meta">
                <span>S: {item.stability.toFixed(1)}d</span>
                <span>Solves: {item.results.length}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </aside>
</div>

{#if statsCaseId && statsCase && statsData}
  <div class="modal-overlay" on:click={closeStats}>
    <div class="modal" on:click|stopPropagation>
      <header>
        <h2>#{statsCase.id} {statsCase.name} Stats</h2>
        <button class="close-btn" on:click={closeStats}>×</button>
      </header>
      <div class="modal-content">
        <div class="modal-case-preview">
          <Cube svg={statsCase.svg} size={150} />
          <div class="case-details">
            <p class="subgroup">{statsCase.subgroup}</p>
            <p class="alg">{statsCase.standard_alg}</p>
          </div>
        </div>

        <div class="stats-overview">
          <div class="stat-box">
            <span class="label">
              Stability
              <button class="info-btn-small" on:click={() => toggleInfo('Stability')}>i</button>
            </span>
            <span class="value">{statsData.fsrs?.stability.toFixed(2)}d</span>
          </div>
          <div class="stat-box">
            <span class="label">
              Difficulty
              <button class="info-btn-small" on:click={() => toggleInfo('Difficulty')}>i</button>
            </span>
            <span class="value">{statsData.fsrs?.difficulty.toFixed(2)}</span>
          </div>
          <div class="stat-box">
            <span class="label">
              Retrievability
              <button class="info-btn-small" on:click={() => toggleInfo('Retrievability')}>i</button>
            </span>
            <span class="value">
              {statsData.fsrs?.stability 
                ? (getRetrievability(statsData.fsrs.stability, statsData.fsrs.last_review || Date.now()) * 100).toFixed(1) 
                : '0'}%
            </span>
          </div>
        </div>

        {#if activeInfo}
          <div class="info-explanation">
            <strong>{activeInfo}:</strong> {infoDescriptions[activeInfo]}
          </div>
        {/if}

        <h3>Recent Times</h3>
        <div class="times-list">
          {#if statsData.results.length === 0}
            <p class="empty">No solves yet.</p>
          {:else}
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Grade</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each [...statsData.results].reverse() as result}
                  <tr>
                    <td class="time-cell">{formatTime(result.time)}s</td>
                    <td><span class="grade-tag grade-{result.grade}">{getGradeLabel(result.grade)}</span></td>
                    <td class="date-cell">{formatDate(result.timestamp)}</td>
                    <td>
                      <button class="delete-result-btn" on:click={() => statsCaseId !== null && removeResult(statsCaseId, result.timestamp)}>×</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 1fr 350px;
    height: calc(100vh - 60px);
  }
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    text-align: center;
    overflow-y: auto;
  }
  .sidebar {
    background: var(--surface-color);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    overflow-y: auto;
  }
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .clear-btn {
    background: var(--surface-color-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .clear-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
  .summary h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
  .summary-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .summary-item {
    background: var(--bg-color);
    padding: 0.8rem;
    border-radius: 8px;
    font-size: 0.9rem;
    border: 1px solid var(--border-color);
    transition: border-color 0.2s;
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }
  .summary-item:hover { border-color: var(--border-color-hover); cursor: pointer; background: var(--surface-color-hover); }
  .item-info {
    flex: 1;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  .modal {
    background: var(--bg-color);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border: 1px solid var(--border-color);
  }
  header {
    padding: 1.2rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h2 { margin: 0; font-size: 1.2rem; color: var(--text-primary); }
  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
  }
  .modal-content {
    padding: 1.2rem;
    overflow-y: auto;
  }
  .modal-case-preview {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
  }
  .modal-case-preview .case-details {
    text-align: left;
    flex: 1;
  }
  .modal-case-preview .subgroup {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin: 0 0 0.5rem 0;
  }
  .modal-case-preview .alg {
    font-family: var(--font-mono);
    color: var(--primary-color);
    font-weight: bold;
    font-size: 1.1rem;
    margin: 0;
  }
  .stats-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-box {
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 10px;
    text-align: center;
    border: 1px solid var(--border-color);
  }
  .stat-box .label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.3rem;
  }
  .info-btn-small {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: var(--surface-color-hover);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    font-size: 10px;
    font-family: serif;
    font-style: italic;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0;
    line-height: 1;
  }
  .info-btn-small:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
  .info-explanation {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid var(--primary-color);
    padding: 0.8rem;
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .stat-box .value {
    font-weight: bold;
    color: var(--primary-color);
    font-size: 1.1rem;
  }
  .times-list table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .times-list th {
    text-align: left;
    padding: 0.5rem;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-color);
    font-weight: 500;
  }
  .times-list td {
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  .time-cell { font-family: var(--font-mono); font-weight: bold; color: var(--text-primary); }
  .date-cell { color: var(--text-muted); font-size: 0.8rem; }
  .grade-tag {
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
  }
  .grade-1 { background: #ef4444; color: #fff; }
  .grade-2 { background: #f97316; color: #fff; }
  .grade-3 { background: #22c55e; color: var(--bg-color); }
  .grade-4 { background: #3b82f6; color: #fff; }
  .delete-result-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.1rem;
  }
  .delete-result-btn:hover { color: #ef4444; }
  .empty { color: var(--text-muted); text-align: center; padding: 2rem; }
  .item-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    align-items: center;
  }
  .item-id { color: var(--text-muted); font-weight: bold; }
  .item-name { flex: 1; text-align: left; color: var(--text-secondary); }
  .item-r { color: var(--primary-color); font-weight: bold; }
  .item-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: flex;
    gap: 1rem;
  }

  .scramble {
    font-size: 1.75rem;
    font-weight: bold;
    margin-bottom: 3rem;
    max-width: 700px;
    color: var(--text-primary);
    font-family: var(--font-mono);
  }
  .display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3rem;
  }
  .case-preview-container {
    position: relative;
    cursor: pointer;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  .reveal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
    color: #fff;
    font-weight: bold;
    font-size: 1.25rem;
    z-index: 10;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    text-align: center;
    padding: 1rem;
    box-sizing: border-box;
  }
  .blurred :global(.svg-container) {
    filter: blur(50px);
  }
  .timer {
    font-size: 5rem;
    font-family: var(--font-mono);
    transition: color 0.1s;
    color: var(--text-secondary);
  }
  .timer.holding { color: #fbbf24; } /* Yellow */
  .timer.ready { color: #22c55e; }    /* Green */
  .timer.running { color: var(--text-primary); }

  .rating-display {
    margin-top: 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  .score-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .grade-badge {
    padding: 0.5rem 1.5rem;
    border-radius: 99px;
    font-weight: bold;
    font-size: 1.25rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .score-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .performance-score {
    font-size: 2.5rem;
    font-weight: bold;
    color: var(--primary-color);
    font-family: var(--font-mono);
    cursor: help;
    line-height: 1;
  }
  .vs-avg-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .session-stats {
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    margin-bottom: 1rem;
  }
  .session-stats h3 {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .session-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .reset-link {
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 0.7rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    opacity: 0.7;
  }
  .reset-link:hover { opacity: 1; }
  .memorized-count {
    font-size: 0.75rem;
    color: var(--primary-color);
    font-weight: bold;
    background: rgba(251, 191, 36, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
  .session-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .grade-breakdown {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-color);
    margin-bottom: 0.5rem;
  }
  .grade-bar { transition: flex 0.3s ease; }
  .grade-bar.dnf { background: #ef4444; }
  .grade-bar.hard { background: #f97316; }
  .grade-bar.good { background: #22c55e; }
  .grade-bar.easy { background: #3b82f6; }

  .grade-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .session-box {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .session-box .label {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .session-box .value {
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--text-primary);
  }
  .session-box .value small {
    font-size: 0.7rem;
    color: #ef4444;
    font-weight: normal;
  }

  .grade-badge.grade-1 { background: #ef4444; }
  .grade-badge.grade-2 { background: #f97316; }
  .grade-badge.grade-3 { background: #22c55e; color: var(--bg-color); }
  .grade-badge.grade-4 { background: #3b82f6; }

  .next-hint {
    color: var(--text-muted);
    font-size: 1rem;
  }
  .next-hint strong { color: var(--text-primary); }

  .hints { margin-top: 3rem; color: var(--text-muted); font-size: 0.9rem; }
  .hints strong { color: var(--text-secondary); }
  .msg { font-size: 1.2rem; }
  .msg a { color: var(--primary-color); }
  .case-info { margin-top: 3rem; }
  .case-info.blurred { opacity: 0; pointer-events: none; }
  .case-info h2 { margin-bottom: 0.75rem; color: var(--text-primary); }
  .std-alg {
    font-family: var(--font-mono);
    font-size: 1.25rem;
    background: var(--surface-color);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    display: inline-block;
    border: 1px solid var(--border-color);
    color: var(--primary-color);
  }
</style>
