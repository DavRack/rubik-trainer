export function downloadState() {
  const ollStatsRaw = localStorage.getItem('oll-stats-v2');
  const bldStatsRaw = localStorage.getItem('bld-stats');
  const selectedOllRaw = localStorage.getItem('selected-oll');

  const ollStats = ollStatsRaw ? JSON.parse(ollStatsRaw) : {};
  const bldStats = bldStatsRaw ? JSON.parse(bldStatsRaw) : {};
  const selectedOll = selectedOllRaw ? JSON.parse(selectedOllRaw) : [];

  // Remove fsrs from all entries as it can be recalculated (OLL) or isn't needed for portability (BLD)
  Object.values(ollStats).forEach((v: any) => delete v.fsrs);
  Object.values(bldStats).forEach((v: any) => delete v.fsrs);

  const state = {
    ollStats,
    bldStats,
    selectedOll
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
        console.log("Backup file read successfully. Parsing JSON...");
        const state = JSON.parse(e.target?.result as string);
        console.log("State keys found:", Object.keys(state));
        console.log("Full state object for debug:", state);
        
        if (state.ollStats) {
          console.log("Loading ollStats...");
          const val = typeof state.ollStats === 'string' ? state.ollStats : JSON.stringify(state.ollStats);
          localStorage.setItem('oll-stats-v2', val);
        }
        if (state.bldStats) {
          console.log("Loading bldStats...");
          const val = typeof state.bldStats === 'string' ? state.bldStats : JSON.stringify(state.bldStats);
          localStorage.setItem('bld-stats', val);
        }
        if (state.selectedOll) {
          console.log("Loading selectedOll...");
          const val = typeof state.selectedOll === 'string' ? state.selectedOll : JSON.stringify(state.selectedOll);
          localStorage.setItem('selected-oll', val);
        }
        
        console.log("All fields processed successfully.");
        resolve();
      } catch (err) {
        console.error("Error during loadState JSON parsing or processing:", err);
        reject(new Error("Invalid backup file"));
      }
    };
    reader.onerror = () => {
      console.error("FileReader error:", reader.error);
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
}
