<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ollCases, type OLLCase } from '$lib/data/oll';
  import { stats, addResult, removeResult, clearAllStats, type Result } from '$lib/stores/stats';
  import Cube from '$lib/components/Cube.svelte';
  import { browser } from '$app/environment';

  let selectedIds: number[] = [];
  let currentCase: OLLCase | null = null;
  let seenIds: Set<number> = new Set();
  
  let timerState: 'idle' | 'running' | 'finished' = 'idle';
  let startTime = 0;
  let currentTime = 0;
  let interval: any;
  let lastTime: number | null = null;
  let lastDnf: boolean = false;

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

  let sessionSeen: Set<number> = new Set();

  function nextCase() {
    if (selectedIds.length === 0) return;

    const sortedByWorst = [...selectedIds].sort((a, b) => getWorstScore(b) - getWorstScore(a));
    let selectedId: number;

    // First pass: Show every case at least once
    const unseen = selectedIds.filter(id => !sessionSeen.has(id));
    if (unseen.length > 0) {
      // Pick a random one from unseen to make the first pass varied
      selectedId = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
      // After first pass, always pick the worst one
      selectedId = sortedByWorst[0];
    }

    currentCase = ollCases.find(c => c.id === selectedId) || null;
    sessionSeen.add(selectedId);
    sessionSeen = sessionSeen; // Trigger reactivity
    timerState = 'idle';
    currentTime = 0;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'running') {
        stopTimer(false);
      }
    } else if (e.code === 'Backspace') {
      e.preventDefault();
      if (timerState === 'running') {
        stopTimer(true);
      } else if (timerState === 'idle' || timerState === 'finished') {
        // Mark current/last as DNF and go next
        if (currentCase) {
          addResult(currentCase.id, 0, true);
          nextCase();
        }
      }
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (timerState === 'idle') {
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

  let lastSolveId: number | null = null;
  let lastSolveTimeInput: string = "";

  function getWorstScore(id: number) {
    const results = $stats[id] || [];
    if (results.length === 0) return 1000000; // Unseen cases first
    
    const last = results[results.length - 1];
    if (last.dnf) return 999999; // DNF is considered worst
    return last.time;
  }

  $: sortedSummary = selectedIds
    .map(id => ({
      id,
      name: ollCases.find(c => c.id === id)?.name || "Unknown",
      results: $stats[id] || [],
      score: getWorstScore(id)
    }))
    .sort((a, b) => b.score - a.score);

  function stopTimer(dnf: boolean) {
    clearInterval(interval);
    timerState = 'finished';
    const finalTime = (Date.now() - startTime) / 1000;
    currentTime = finalTime;
    
    if (currentCase) {
      addResult(currentCase.id, finalTime, dnf);
      lastSolveId = currentCase.id;
      lastSolveTimeInput = finalTime.toFixed(2);
      lastTime = finalTime;
      lastDnf = dnf;
      
      if (dnf) {
        nextCase();
      } else {
        setTimeout(() => {
          if (timerState === 'finished') nextCase();
        }, 1000);
      }
    }
  }

  function updateLastSolve(dnf: boolean) {
    if (lastSolveId === null) return;
    const time = parseFloat(lastSolveTimeInput) || 0;
    stats.update(s => {
      const results = [...(s[lastSolveId!] || [])];
      if (results.length > 0) {
        results[results.length - 1] = { time, dnf, timestamp: Date.now() };
      }
      return { ...s, [lastSolveId!]: results };
    });
    lastDnf = dnf;
    if (!dnf) currentTime = time;
  }

  function formatTime(t: number) {
    return t.toFixed(2);
  }
</script>

<nav>
  <a href="/">All Cases</a>
  <a href="/practice">Practice</a>
</nav>

<div class="layout">
  <main>
    {#if selectedIds.length === 0}
      <div class="msg">No cases selected. <a href="/">Go select some</a>.</div>
    {:else if currentCase}
      <div class="scramble">{currentCase.setup}</div>
      
      <div class="display">
        <Cube svg={currentCase.svg} size={250} />
        <div class="timer" class:running={timerState === 'running'} class:dnf={lastDnf && timerState === 'finished'}>
          {timerState === 'finished' && lastDnf ? 'DNF' : formatTime(currentTime)}
        </div>
      </div>

      <div class="hints">
        <p>Press <strong>Space</strong> to {timerState === 'idle' ? 'start' : 'stop'}</p>
        <p>Press <strong>Backspace</strong> for DNF</p>
      </div>

      <div class="case-info">
        <h2>{currentCase.name} ({currentCase.subgroup})</h2>
        <p class="std-alg">Alg: {currentCase.standard_alg}</p>
      </div>
    {/if}
  </main>

  <aside class="sidebar">
    <section class="last-solve">
      <h3>Last Solve</h3>
      {#if lastSolveId !== null}
        <div class="edit-row">
          <input type="number" step="0.01" bind:value={lastSolveTimeInput} on:change={() => updateLastSolve(false)} />
          <button on:click={() => updateLastSolve(true)} class:active={lastDnf}>DNF</button>
          <button on:click={() => updateLastSolve(false)}>Save</button>
        </div>
      {:else}
        <p>No solves yet</p>
      {/if}
    </section>

    <section class="summary">
      <div class="summary-header">
        <h3>Session Summary</h3>
        <button class="clear-btn" on:click={() => { if(confirm('Clear all session data?')) clearAllStats(); }}>Clear All</button>
      </div>
      <div class="summary-list">
        {#each sortedSummary as item}
          <div class="summary-item" class:has-dnf={item.results.some(r => r.dnf)}>
            <div class="item-header">
              <span class="item-id">#{item.id}</span>
              <span class="item-name">{item.name}</span>
            </div>
            <div class="item-times">
              {#each item.results.slice(-5) as res}
                <span class="time-tag" class:is-dnf={res.dnf}>
                  {res.dnf ? 'DNF' : res.time.toFixed(2)}
                  <button class="remove-btn" on:click|stopPropagation={() => removeResult(item.id, res.timestamp)}>×</button>
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>
  </aside>
</div>

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
    background: #111;
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    overflow-y: auto;
  }
  .last-solve {
    background: #222;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #444;
  }
  .edit-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .edit-row input {
    background: #000;
    color: #fff;
    border: 1px solid #444;
    padding: 0.3rem;
    width: 80px;
  }
  .edit-row button {
    background: #444;
    color: #fff;
    border: none;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .edit-row button.active {
    background: #ff4444;
  }
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .clear-btn {
    background: #444;
    color: #fff;
    border: none;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
  }
  .clear-btn:hover { background: #ff4444; }
  .summary h3 { margin: 0; }
  .summary-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .summary-item {
    background: #1a1a1a;
    padding: 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  .summary-item.has-dnf { border-left: 3px solid #ff4444; }
  .item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }
  .item-id { color: #888; }
  .item-times {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .time-tag {
    background: #333;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .time-tag.is-dnf { color: #ff4444; font-weight: bold; }
  .remove-btn {
    background: none;
    border: none;
    color: #666;
    padding: 0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .remove-btn:hover { color: #fff; }

  .scramble {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 2rem;
    max-width: 600px;
  }
  .display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }
  .timer {
    font-size: 4rem;
    font-family: monospace;
  }
  .timer.running { color: #ffd500; }
  .timer.dnf { color: #ff4444; }
  .hints {
    margin-top: 2rem;
    color: #888;
  }
  .msg { font-size: 1.2rem; }
  .msg a { color: #ffd500; }
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #111;
    height: 60px;
    align-items: center;
  }
  nav a {
    color: #aaa;
    text-decoration: none;
  }
  nav a:hover {
    color: #fff;
  }
  .case-info h2 {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .std-alg {
    font-family: monospace;
    font-size: 1.2rem;
    background: #222;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    display: inline-block;
  }
</style>
