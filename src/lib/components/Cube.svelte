<script lang="ts">
  export let svg: string | null = null;
  export let stickers: string | null = null; // 21 chars: 9 top, 3 back, 3 right, 3 front, 3 left
  export let size: number = 100;

  $: top = stickers?.slice(0, 9).split('');
  $: back = stickers?.slice(9, 12).split('');
  $: right = stickers?.slice(12, 15).split('');
  $: front = stickers?.slice(15, 18).split('');
  $: left = stickers?.slice(18, 21).split('');

  const getColor = (char: string) => (char === 'Y' ? '#FFD500' : '#444');
</script>

{#if svg}
  <div class="svg-container" style="width: {size}px; height: {size}px;">
    {@html svg}
  </div>
{:else if stickers}
  <svg width={size} height={size} viewBox="0 0 100 100">
    <!-- Top 3x3 -->
    {#each top as char, i}
      <rect
        x={20 + (i % 3) * 20}
        y={20 + Math.floor(i / 3) * 20}
        width="18"
        height="18"
        fill={getColor(char)}
        rx="2"
      />
    {/each}

    <!-- Back stickers -->
    {#each back as char, i}
      <rect
        x={20 + i * 20}
        y="5"
        width="18"
        height="10"
        fill={getColor(char)}
        rx="1"
      />
    {/each}

    <!-- Right stickers -->
    {#each right as char, i}
      <rect
        x="85"
        y={20 + i * 20}
        width="10"
        height="18"
        fill={getColor(char)}
        rx="1"
      />
    {/each}

    <!-- Front stickers -->
    {#each front as char, i}
      <rect
        x={20 + (2-i) * 20}
        y="85"
        width="18"
        height="10"
        fill={getColor(char)}
        rx="1"
      />
    {/each}

    <!-- Left stickers -->
    {#each left as char, i}
      <rect
        x="5"
        y={20 + (2-i) * 20}
        width="10"
        height="18"
        fill={getColor(char)}
        rx="1"
      />
    {/each}
  </svg>
{/if}

<style>
  svg, .svg-container {
    border: 1px solid #333;
    border-radius: 4px;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .svg-container :global(svg) {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  }
</style>
