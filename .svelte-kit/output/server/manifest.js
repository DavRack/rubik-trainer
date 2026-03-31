export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.KPZbkLPl.js",app:"_app/immutable/entry/app.A0bmpCUI.js",imports:["_app/immutable/entry/start.KPZbkLPl.js","_app/immutable/chunks/BK7MzJEJ.js","_app/immutable/chunks/Db16CcuL.js","_app/immutable/chunks/D8g8LKP0.js","_app/immutable/entry/app.A0bmpCUI.js","_app/immutable/chunks/Db16CcuL.js","_app/immutable/chunks/CIzd5IOQ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/","/practice"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
