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
    padding: 6rem 2rem;
    max-width: 900px;
    margin: 0 auto;
    text-align: center;
  }
  h1 {
    font-size: 3.5rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  p {
    color: var(--text-secondary);
    font-size: 1.25rem;
    margin-bottom: 4rem;
  }
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
  }
  .tool-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 2.5rem;
    border-radius: 16px;
    text-align: left;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: block;
    text-decoration: none;
    box-shadow: var(--shadow);
  }
  .tool-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-8px);
    background: var(--surface-color-hover);
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
  }
  .tool-card h2 {
    margin-top: 0;
    color: var(--text-primary);
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .tool-card p {
    margin-bottom: 0;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .backup-section {
    margin-top: 5rem;
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    border-top: 1px solid var(--border-color);
    padding-top: 3rem;
  }
  .backup-btn {
    background: var(--surface-color);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  .backup-btn:hover {
    background: var(--surface-color-hover);
    color: var(--text-primary);
    border-color: var(--border-color-hover);
  }
  .load-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
</style>
