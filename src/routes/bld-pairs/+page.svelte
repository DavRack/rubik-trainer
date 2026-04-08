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
    margin-bottom: 2rem;
  }
  h1 { margin: 0; color: #ffd500; }
  .actions { display: flex; gap: 1rem; }
  .view-btn {
    background: #222;
    color: #888;
    border: 1px solid #333;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
  }
  .view-btn.active {
    background: #ffd500;
    color: #000;
    border-color: #ffd500;
  }
  .practice-trigger {
    background: #333;
    color: #fff;
  }

  .search-bar { margin-bottom: 2rem; }
  .search-bar input {
    width: 100%;
    background: #111;
    border: 1px solid #333;
    color: #fff;
    padding: 1rem;
    border-radius: 8px;
    font-size: 1.1rem;
  }

  .pairs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.5rem;
  }
  .pair-card {
    background: #111;
    border: 1px solid #333;
    padding: 1.5rem;
    border-radius: 12px;
    position: relative;
    text-align: center;
    transition: transform 0.2s;
  }
  .pair-card:hover { transform: translateY(-3px); border-color: #555; }
  .delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: #444;
    font-size: 1.2rem;
    cursor: pointer;
  }
  .delete-btn:hover { color: #ff4444; }
  .pair-id { font-size: 2rem; font-weight: bold; margin-bottom: 0.2rem; color: #fff; }
  .pair-num { font-size: 0.8rem; color: #666; margin-bottom: 1rem; }
  .pair-card input {
    width: 100%;
    background: #000;
    border: 1px solid #333;
    color: #ffd500;
    padding: 0.5rem;
    border-radius: 4px;
    text-align: center;
  }

  /* Practice */
  .practice-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }
  .card-container { width: 100%; max-width: 500px; }
  .flashcard {
    background: #111;
    border: 1px solid #333;
    border-radius: 20px;
    padding: 3rem;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .pair-display { font-size: 5rem; font-weight: bold; color: #fff; margin-bottom: 1rem; }
  .hint { color: #555; font-size: 0.9rem; }
  .card-back {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #333;
  }
  .memo-display { font-size: 2.5rem; color: #ffd500; margin-bottom: 2rem; font-weight: bold; }
  
  .rating-buttons { display: flex; gap: 0.8rem; justify-content: center; }
  .rate-btn {
    border: none;
    padding: 0.8rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    min-width: 70px;
  }
  .rate-btn span { font-size: 0.7rem; opacity: 0.6; }
  .again { background: #ff4444; color: #fff; }
  .hard { background: #ff8800; color: #fff; }
  .good { background: #44ff44; color: #000; }
  .easy { background: #0088ff; color: #fff; }

  .finished { text-align: center; }
  .finished h2 { color: #ffd500; margin-bottom: 2rem; }
  .finished button {
    background: #333;
    color: #fff;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    cursor: pointer;
  }
</style>
