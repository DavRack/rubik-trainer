<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ollCases, type OLLCase } from '$lib/data/oll';
  import { stats, rateCase, removeResult, clearAllStats, getRetrievability } from '$lib/stores/stats';
  import Cube from '$lib/components/Cube.svelte';
  import { browser } from '$app/environment';
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

</script>

<div class="layout">
  <main>
    {#if selectedIds.length === 0}
      <div class="msg">No cases selected. <a href="/oll">Go select some</a>.</div>
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
          <div class="summary-item">
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
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
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
    padding: 0.8rem;
    border-radius: 6px;
    font-size: 0.9rem;
    border-left: 3px solid #333;
  }
  .item-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    align-items: center;
  }
  .item-id { color: #888; font-weight: bold; }
  .item-name { flex: 1; text-align: left; }
  .item-r { color: #ffd500; font-weight: bold; }
  .item-meta {
    font-size: 0.75rem;
    color: #666;
    display: flex;
    gap: 1rem;
  }

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
  .case-preview-container {
    position: relative;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
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
    background: rgba(0,0,0,0.4);
    color: #fff;
    font-weight: bold;
    font-size: 1.2rem;
    z-index: 10;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    text-align: center;
    padding: 1rem;
    box-sizing: border-box;
  }
  .blurred :global(.svg-container) {
    filter: blur(40px);
  }
  .timer {
    font-size: 4rem;
    font-family: monospace;
    transition: color 0.1s;
  }
  .timer.ready { color: #ffd500; }
  .timer.running { color: #44ff44; }

  .rating-controls {
    margin-top: 2rem;
    background: #111;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #333;
  }
  .rating-controls p { margin-top: 0; color: #888; }
  .buttons { display: flex; gap: 0.8rem; }
  .rate-btn {
    border: none;
    padding: 0.8rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    min-width: 80px;
    transition: transform 0.1s;
  }
  .rate-btn:hover { transform: scale(1.05); }
  .rate-btn span { font-size: 0.7rem; opacity: 0.6; }
  .again { background: #ff4444; color: #fff; }
  .hard { background: #ff8800; color: #fff; }
  .good { background: #44ff44; color: #000; }
  .easy { background: #0088ff; color: #fff; }

  .hints { margin-top: 2rem; color: #888; }
  .msg { font-size: 1.2rem; }
  .msg a { color: #ffd500; }
  .case-info { margin-top: 2rem; }
  .case-info.blurred { opacity: 0; pointer-events: none; }
  .case-info h2 { margin-bottom: 0.5rem; }
  .std-alg {
    font-family: monospace;
    font-size: 1.2rem;
    background: #222;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    display: inline-block;
  }
</style>
