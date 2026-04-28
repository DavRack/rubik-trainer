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
  
  let timerState: 'idle' | 'ready' | 'running' | 'finished' = 'idle';
  let startTime = 0;
  let currentTime = 0;
  let interval: any;
  let lastTime: number | null = null;

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
    }
  });

  function nextCase() {
    if (selectedIds.length === 0) return;

    if (currentCase) {
      lastCaseId = currentCase.id;
    }

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
    timerState = 'idle';
    currentTime = 0;
    showCase = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (timerState === 'finished') {
      if (e.key === '1') handleRate(1);
      if (e.key === '2') handleRate(2);
      if (e.key === '3') handleRate(3);
      if (e.key === '4') handleRate(4);
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'idle') {
        timerState = 'ready';
      } else if (timerState === 'running') {
        stopTimer();
      }
    } else if (e.code === 'Backspace') {
      e.preventDefault();
      if (timerState === 'running') {
        stopTimer();
      } else if (timerState === 'idle') {
        // Instant "Again"
        if (currentCase) {
          handleRate(1);
        }
      }
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'ready') {
        startTimer();
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

  function stopTimer() {
    clearInterval(interval);
    timerState = 'finished';
    const finalTime = (Date.now() - startTime) / 1000;
    currentTime = finalTime;
    lastTime = finalTime;
    showCase = true; // Always reveal after solve
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
      const caseData = $stats[id];
      const fsrs = caseData?.fsrs;
      const r = fsrs ? getRetrievability(fsrs.stability, fsrs.last_review!) : 1;
      return {
        id,
        name: ollCases.find(c => c.id === id)?.name || "Unknown",
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
        <div class="timer" class:ready={timerState === 'ready'} class:running={timerState === 'running'}>
          {formatTime(currentTime)}
        </div>
      </div>

      {#if timerState === 'finished'}
        <div class="rating-controls">
          <p>How was that solve?</p>
          <div class="buttons">
            <button class="rate-btn again" on:click={() => handleRate(1)}><span>1</span> Again</button>
            <button class="rate-btn hard" on:click={() => handleRate(2)}><span>2</span> Hard</button>
            <button class="rate-btn good" on:click={() => handleRate(3)}><span>3</span> Good</button>
            <button class="rate-btn easy" on:click={() => handleRate(4)}><span>4</span> Easy</button>
          </div>
        </div>
      {:else}
        <div class="hints">
          <p>Press <strong>Space</strong> to {timerState === 'idle' ? 'start' : 'stop'}</p>
          <p>Press <strong>Backspace</strong> to skip/fail</p>
        </div>
      {/if}

      <div class="case-info" class:blurred={!showCase}>
        <h2>{currentCase.name} ({currentCase.subgroup})</h2>
        <p class="std-alg">Alg: {currentCase.standard_alg}</p>
      </div>
    {/if}
  </main>

  <aside class="sidebar">
    <section class="summary">
      <div class="summary-header">
        <h3>Spaced Repetition</h3>
        <button class="clear-btn" on:click={() => { if(confirm('Clear all session data?')) clearAllStats(); }}>Clear All</button>
      </div>
      <div class="summary-list">
        {#each sortedSummary as item}
          <div class="summary-item" on:click={() => statsCaseId = item.id}>
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
            <span class="value">{(getRetrievability(statsData.fsrs?.stability || 0, statsData.fsrs?.last_review || Date.now()) * 100).toFixed(1)}%</span>
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
  }
  .summary-item:hover { border-color: var(--border-color-hover); cursor: pointer; background: var(--surface-color-hover); }

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
  .timer.ready { color: var(--primary-color); }
  .timer.running { color: #22c55e; }

  .rating-controls {
    margin-top: 3rem;
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
  }
  .rating-controls p { margin-top: 0; color: var(--text-muted); font-weight: 500; }
  .buttons { display: flex; gap: 1rem; }
  .rate-btn {
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    min-width: 90px;
    transition: all 0.15s;
    color: #fff;
  }
  .rate-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .rate-btn span { font-size: 0.75rem; opacity: 0.7; }
  .again { background: #ef4444; }
  .hard { background: #f97316; }
  .good { background: #22c55e; color: var(--bg-color); }
  .easy { background: #3b82f6; }

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
