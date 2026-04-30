<script lang="ts">
  import { ollCases, type OLLCase } from '$lib/data/oll';
  import Cube from '$lib/components/Cube.svelte';
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

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

<main>
  <h1>OLL Trainer</h1>
  <div class="controls">
    <button on:click={selectAll}>Select All</button>
    <button on:click={clearAll}>Clear All</button>
    <a href="{base}/oll/practice" class="practice-btn" class:disabled={selectedIds.size === 0}>
      Practice {selectedIds.size} cases
    </a>
  </div>

  <div class="grid">
    {#each ollCases as oll}
      <div class="case" class:selected={selectedIds.has(oll.id)} on:click={() => toggle(oll.id)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggle(oll.id)}>
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
  <div class="modal-overlay" on:click={closeInfo} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && closeInfo()}>
    <div class="modal" on:click|stopPropagation role="presentation">
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
    background: var(--surface-color);
    padding: 0.5rem;
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: var(--shadow);
  }
  .case:hover {
    border-color: var(--border-color-hover);
    background: var(--surface-color-hover);
    transform: translateY(-2px);
  }
  .case.selected {
    border-color: var(--primary-color);
    background: rgba(251, 191, 36, 0.05);
  }
  .info {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    width: 100%;
  }
  .id { color: var(--text-muted); font-weight: bold; }
  .name { 
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.3rem;
  }
  .info-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--surface-color-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    line-height: 20px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 2;
    transition: all 0.2s;
  }
  .info-btn:hover { 
    background: var(--primary-color); 
    color: var(--bg-color);
    border-color: var(--primary-color);
  }

  .controls {
    margin-bottom: 2rem;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  button, .practice-btn {
    background: var(--surface-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }
  button:hover { 
    background: var(--surface-color-hover); 
    border-color: var(--border-color-hover);
  }
  .practice-btn { 
    background: var(--primary-color); 
    color: var(--bg-color); 
    border-color: var(--primary-color);
    font-weight: bold; 
  }
  .practice-btn:hover {
    background: var(--primary-color-hover);
  }
  .practice-btn.disabled { opacity: 0.4; pointer-events: none; }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: var(--bg-color);
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border: 1px solid var(--border-color);
  }
  header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 0.2s;
  }
  .close-btn:hover { color: var(--text-primary); }
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
  .main-details strong { color: var(--text-secondary); display: block; margin-bottom: 0.2rem; font-size: 0.9rem; }
  .alg-code {
    display: block;
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 8px;
    font-family: var(--font-mono);
    margin-top: 0.5rem;
    border: 1px solid var(--border-color);
    font-size: 1.1rem;
    color: var(--text-primary);
  }
  .alg-code.highlighted {
    border-color: var(--primary-color);
    background: rgba(251, 191, 36, 0.05);
  }
  .algs-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .alt-alg {
    background: var(--surface-color);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }
  .alt-moves {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }
  .alt-meta {
    font-size: 0.85rem;
    color: var(--text-muted);
    display: flex;
    gap: 1.5rem;
  }
  .votes { color: var(--primary-color); }
</style>
