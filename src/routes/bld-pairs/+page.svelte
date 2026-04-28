<script lang="ts">
  import { bldStats, updateMemo, toggleDelete, ratePair, nextPracticePair, addCustomPair, resetBLDStats } from '$lib/stores/bld';
  import type { Grade } from '$lib/fsrs';
  import { onMount } from 'svelte';

  let view: 'discover' | 'practice' = 'discover';
  let searchTerm = '';
  let showMemo = false;
  let currentPairId: string | null = null;

  $: allPairs = Object.values($bldStats)
    .filter(p => !p.deleted)
    .filter(p => p.id.toLowerCase().includes(searchTerm.toLowerCase()) || p.memo.toLowerCase().includes(searchTerm.toLowerCase()));

  $: memoCount = Object.values($bldStats).filter(p => !p.deleted && p.memo.trim() !== "").length;

  function handleReset() {
    if (confirm("Reset ALL cards to default? This will clear all your progress and custom words.")) {
      resetBLDStats();
    }
  }

  function addNewPair() {
    const id = prompt("Enter a letter pair (e.g. AB, 12, etc.):");
    if (id && id.trim()) {
      addCustomPair(id.toUpperCase().trim());
    }
  }

  function startPractice() {
    currentPairId = nextPracticePair();
    if (!currentPairId) {
      alert("Please add some memo words first!");
      return;
    }
    view = 'practice';
    showMemo = false;
  }

  function handleRate(grade: Grade) {
    if (currentPairId) {
      ratePair(currentPairId, grade);
      currentPairId = nextPracticePair();
      showMemo = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (view !== 'practice') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      showMemo = true;
    } else if (showMemo) {
      if (e.key === '1') handleRate(1);
      if (e.key === '2') handleRate(2);
      if (e.key === '3') handleRate(3);
      if (e.key === '4') handleRate(4);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<main>
  <header class="main-header">
    <h1>BLD Letter Pairs</h1>
    <div class="actions">
      {#if view === 'discover'}
        <button class="view-btn reset-btn" on:click={handleReset}>Reset Cards</button>
        <button class="view-btn add-btn" on:click={addNewPair}>+ Add Pair</button>
      {/if}
      <button class="view-btn" class:active={view === 'discover'} on:click={() => view = 'discover'}>Discover</button>
      <button class="view-btn practice-trigger" class:active={view === 'practice'} on:click={startPractice}>
        Practice ({memoCount} pairs)
      </button>
    </div>
  </header>

  {#if view === 'discover'}
    <div class="discover-view">
      <div class="search-bar">
        <input type="text" placeholder="Search pairs or words..." bind:value={searchTerm} />
      </div>

      <div class="pairs-grid">
        {#each allPairs as pair}
          <div class="pair-card">
            <button class="delete-btn" on:click={() => toggleDelete(pair.id)}>×</button>
            <div class="pair-id">{pair.id}</div>
            <div class="pair-num">#{pair.num}</div>
            <input 
              type="text" 
              placeholder="Memo word..." 
              value={pair.memo} 
              on:input={(e) => updateMemo(pair.id, e.currentTarget.value)}
            />
          </div>
        {/each}
      </div>
    </div>
  {:else if view === 'practice'}
    <div class="practice-view">
      {#if currentPairId}
        <div class="card-container">
          <div class="flashcard">
            <div class="card-front">
              <div class="pair-display">{currentPairId}</div>
              <div class="hint">Press Space to Reveal</div>
            </div>
            
            {#if showMemo}
              <div class="card-back">
                <div class="memo-display">{$bldStats[currentPairId].memo}</div>
                <div class="rating-buttons">
                  <button class="rate-btn again" on:click={() => handleRate(1)}><span>1</span> Again</button>
                  <button class="rate-btn hard" on:click={() => handleRate(2)}><span>2</span> Hard</button>
                  <button class="rate-btn good" on:click={() => handleRate(3)}><span>3</span> Good</button>
                  <button class="rate-btn easy" on:click={() => handleRate(4)}><span>4</span> Easy</button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="finished">
          <h2>All done for now!</h2>
          <button on:click={() => view = 'discover'}>Back to Discover</button>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  main {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  .main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.5rem;
  }
  h1 { margin: 0; color: var(--primary-color); font-weight: 800; }
  .actions { display: flex; gap: 0.75rem; }
  .view-btn {
    background: var(--surface-color);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  .view-btn:hover {
    border-color: var(--border-color-hover);
    color: var(--text-primary);
  }
  .view-btn.active {
    background: var(--primary-color);
    color: var(--bg-color);
    border-color: var(--primary-color);
  }
  .practice-trigger {
    background: var(--surface-color-hover);
    color: var(--text-primary);
    border-color: var(--border-color-hover);
  }
  .practice-trigger:hover {
    border-color: var(--primary-color);
  }

  .search-bar { margin-bottom: 2rem; }
  .search-bar input {
    width: 100%;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    font-size: 1.1rem;
    transition: all 0.2s;
    outline: none;
  }
  .search-bar input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.1);
  }

  .pairs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.5rem;
  }
  .pair-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    border-radius: 16px;
    position: relative;
    text-align: center;
    transition: all 0.2s;
    box-shadow: var(--shadow);
  }
  .pair-card:hover { 
    transform: translateY(-4px); 
    border-color: var(--border-color-hover);
    background: var(--surface-color-hover);
  }
  .delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    transition: color 0.2s;
  }
  .delete-btn:hover { color: #ef4444; }
  .pair-id { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.2rem; color: var(--text-primary); }
  .pair-num { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem; font-weight: 500; }
  .pair-card input {
    width: 100%;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    color: var(--primary-color);
    padding: 0.6rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    transition: all 0.2s;
  }
  .pair-card input:focus {
    border-color: var(--primary-color);
    outline: none;
  }

  /* Practice */
  .practice-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 500px;
  }
  .card-container { width: 100%; max-width: 550px; }
  .flashcard {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 4rem 2rem;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
  }
  .pair-display { font-size: 6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1.5rem; letter-spacing: -0.05em; }
  .hint { color: var(--text-muted); font-size: 1rem; font-weight: 500; }
  .card-back {
    margin-top: 3rem;
    padding-top: 3rem;
    border-top: 1px solid var(--border-color);
  }
  .memo-display { font-size: 3rem; color: var(--primary-color); margin-bottom: 3rem; font-weight: 800; }
  
  .rating-buttons { display: flex; gap: 1rem; justify-content: center; }
  .rate-btn {
    border: none;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    min-width: 85px;
    color: #fff;
    transition: all 0.15s;
  }
  .rate-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .rate-btn span { font-size: 0.75rem; opacity: 0.7; }
  .again { background: #ef4444; }
  .hard { background: #f97316; }
  .good { background: #22c55e; color: var(--bg-color); }
  .easy { background: #3b82f6; }

  .finished { text-align: center; }
  .finished h2 { color: var(--primary-color); margin-bottom: 2rem; font-size: 2rem; }
  .finished button {
    background: var(--surface-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 1rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  .finished button:hover {
    background: var(--surface-color-hover);
    border-color: var(--border-color-hover);
  }
</style>
