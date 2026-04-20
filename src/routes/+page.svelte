<script lang="ts">
  import { downloadState, loadState } from '$lib/utils/backup';
  import { base } from '$app/paths';

  let fileInput: HTMLInputElement;

  async function handleLoad(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        await loadState(file);
        alert("Backup loaded successfully! The page will now reload.");
        window.location.reload();
      } catch (err) {
        alert("Error loading backup: " + (err as Error).message);
      }
    }
  }
</script>

<main>
  <h1>Welcome to OLL Trainer</h1>
  <p>Your one-stop shop for cubing tools.</p>
  
  <div class="tools-grid">
    <a href="{base}/oll" class="tool-card">
      <h2>OLL Trainer</h2>
      <p>Master all 57 Orient Last Layer cases with our interactive trainer.</p>
    </a>
    
    <a href="{base}/bld-pairs" class="tool-card">
      <h2>BLD Letter Pairs</h2>
      <p>Master your letter pairs with Anki-style flashcards and FSRS v5.</p>
    </a>
  </div>

  <div class="backup-section">
    <button class="backup-btn" on:click={downloadState}>Download Backup (JSON)</button>
    <button class="backup-btn load-btn" on:click={() => fileInput.click()}>Load Backup (JSON)</button>
    <input 
      type="file" 
      accept=".json" 
      style="display: none;" 
      bind:this={fileInput} 
      on:change={handleLoad} 
    />
  </div>
</main>

<style>
  main {
    padding: 4rem 2rem;
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }
  h1 {
    font-size: 3rem;
    color: #ffd500;
    margin-bottom: 1rem;
  }
  p {
    color: #888;
    font-size: 1.2rem;
    margin-bottom: 3rem;
  }
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  .tool-card {
    background: #111;
    border: 1px solid #333;
    padding: 2rem;
    border-radius: 12px;
    text-align: left;
    transition: all 0.2s ease;
    position: relative;
    display: block;
    text-decoration: none;
  }
  .tool-card:hover {
    border-color: #ffd500;
    transform: translateY(-5px);
    background: #1a1a1a;
  }
  .tool-card h2 {
    margin-top: 0;
    color: #fff;
  }
  .tool-card p {
    margin-bottom: 0;
    font-size: 1rem;
    line-height: 1.5;
  }

  .backup-section {
    margin-top: 4rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  .backup-btn {
    background: #222;
    color: #aaa;
    border: 1px solid #333;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }
  .backup-btn:hover {
    background: #333;
    color: #fff;
    border-color: #555;
  }
  .load-btn:hover {
    border-color: #ffd500;
  }
</style>
