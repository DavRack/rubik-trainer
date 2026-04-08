export function downloadState() {
  const state = {
    ollStats: localStorage.getItem('oll-stats-v2'),
    bldStats: localStorage.getItem('bld-stats'),
    selectedOll: localStorage.getItem('selected-oll')
  };
  
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cubing-trainer-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadState(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string);
        if (state.ollStats) localStorage.setItem('oll-stats-v2', state.ollStats);
        if (state.bldStats) localStorage.setItem('bld-stats', state.bldStats);
        if (state.selectedOll) localStorage.setItem('selected-oll', state.selectedOll);
        resolve();
      } catch (err) {
        reject(new Error("Invalid backup file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
