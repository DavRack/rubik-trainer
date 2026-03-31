import { c as create_ssr_component } from "../../chunks/ssr.js";
const css = {
  code: "*{box-sizing:border-box}",
  map: '{"version":3,"file":"+layout.svelte","sources":["+layout.svelte"],"sourcesContent":["<slot />\\n\\n<style>\\n  :global(*) {\\n    box-sizing: border-box;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAGU,CAAG,CACT,UAAU,CAAE,UACd"}'
};
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `${slots.default ? slots.default({}) : ``}`;
});
export {
  Layout as default
};
