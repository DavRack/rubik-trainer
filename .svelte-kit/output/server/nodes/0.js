

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BOZgNIh3.js","_app/immutable/chunks/Db16CcuL.js","_app/immutable/chunks/CIzd5IOQ.js"];
export const stylesheets = ["_app/immutable/assets/0.UYjZsC43.css"];
export const fonts = [];
