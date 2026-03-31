<script lang="ts">
  import { ollCases, type OLLCase } from '$lib/data/oll';
  import Cube from '$lib/components/Cube.svelte';
  import { onMount } from 'svelte';

  let selectedIds: Set<number> = new Set();
  let infoCase: OLLCase | null = null;

  onMount(() => {
    const saved = localStorage.getItem('selected-oll');
    if (saved) {
      selectedIds = new Set(JSON.parse(saved));
    }
  });

  function toggle(id: number) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = selectedIds; // trigger reactivity
    localStorage.setItem('selected-oll', JSON.stringify(Array.from(selectedIds)));
  }

  function selectAll() {
    selectedIds = new Set(ollCases.map(c => c.id));
    localStorage.setItem('selected-oll', JSON.stringify(Array.from(selectedIds)));
  }

  function clearAll() {
    selectedIds = new Set();
    localStorage.setItem('selected-oll', JSON.stringify([]));
  }

  function showInfo(e: MouseEvent, oll: OLLCase) {
    e.stopPropagation();
    infoCase = oll;
  }

  function closeInfo() {
    infoCase = null;
  }
</script>

<nav>
  <a href="/">All Cases</a>
  <a href="/practice">Practice</a>
</nav>

<main>
  <h1>OLL Trainer</h1>
  <div class="controls">
    <button on:click={selectAll}>Select All</button>
    <button on:click={clearAll}>Clear All</button>
    <a href="/practice" class="practice-btn" class:disabled={selectedIds.size === 0}>
      Practice {selectedIds.size} cases
    </a>
  </div>

  <div class="grid">
    {#each ollCases as oll}
      <div class="case" class:selected={selectedIds.has(oll.id)} on:click={() => toggle(oll.id)}>
        <Cube svg={oll.svg} size={80} />
        <div class="info">
          <span class="id">#{oll.id}</span>
          <span class="name">{oll.subgroup}</span>
          <button class="info-btn" on:click={(e) => showInfo(e, oll)}>+</button>
        </div>
      </div>
    {/each}
  </div>
</main>

{#if infoCase}
  <div class="modal-overlay" on:click={closeInfo}>
    <div class="modal" on:click|stopPropagation>
      <header>
        <h2>{infoCase.name} ({infoCase.subgroup})</h2>
        <button class="close-btn" on:click={closeInfo}>×</button>
      </header>
      <div class="modal-content">
        <div class="modal-top">
          <Cube svg={infoCase.svg} size={150} />
          <div class="main-details">
            <p><strong>Setup:</strong> <code class="alg-code">{infoCase.setup}</code></p>
            <p><strong>Standard Alg:</strong> <code class="alg-code highlighted">{infoCase.standard_alg}</code></p>
          </div>
        </div>
        
        <h3>Alternative Algorithms</h3>
        <div class="algs-list">
          {#each infoCase.algs.sort((a, b) => b.votes - a.votes) as alt}
            <div class="alt-alg">
              <div class="alt-moves">{alt.alg}</div>
              <div class="alt-meta">
                <span class="votes">👍 {alt.votes}</span>
                {#if alt.stm}<span class="moves">{alt.stm} STM</span>{/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    background: #000;
    color: #fff;
    font-family: sans-serif;
    margin: 0;
  }
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #111;
  }
  nav a {
    color: #aaa;
    text-decoration: none;
  }
  nav a:hover {
    color: #fff;
  }
  main {
    padding: 1rem;
    max-width: 1000px;
    margin: 0 auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  .case {
    background: #222;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    border: 2px solid transparent;
    transition: 0.2s;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .case.selected {
    border-color: #ffd500;
    background: #333;
  }
  .info {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    width: 100%;
  }
  .id { color: #888; font-weight: bold; }
  .name { 
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.3rem;
  }
  .info-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #444;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    line-height: 18px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 2;
  }
  .info-btn:hover { background: #666; }

  .controls {
    margin-bottom: 2rem;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  button, .practice-btn {
    background: #333;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
  }
  button:hover { background: #444; }
  .practice-btn { background: #ffd500; color: #000; font-weight: bold; }
  .practice-btn.disabled { opacity: 0.5; pointer-events: none; }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #1a1a1a;
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border: 1px solid #333;
  }
  header {
    padding: 1.5rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h2 { margin: 0; font-size: 1.2rem; }
  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .close-btn:hover { color: #fff; }
  .modal-content {
    padding: 1.5rem;
    overflow-y: auto;
  }
  .modal-top {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
    align-items: flex-start;
  }
  .main-details { flex: 1; }
  .alg-code {
    display: block;
    background: #000;
    padding: 0.8rem;
    border-radius: 6px;
    font-family: monospace;
    margin-top: 0.4rem;
    border: 1px solid #444;
  }
  .alg-code.highlighted {
    border-color: #ffd500;
    color: #ffd500;
  }
  .algs-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .alt-alg {
    background: #252525;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #333;
  }
  .alt-moves {
    font-family: monospace;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  .alt-meta {
    font-size: 0.8rem;
    color: #888;
    display: flex;
    gap: 1rem;
  }
</style>
