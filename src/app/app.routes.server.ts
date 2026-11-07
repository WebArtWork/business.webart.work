import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
	{
		// depend on the signed-in user, who only exists in the browser
		path: 'profile',
		renderMode: RenderMode.Client,
	},
	{
		path: 'theory',
		renderMode: RenderMode.Client,
	},
	{
		path: 'theory/:slug',
		renderMode: RenderMode.Client,
	},
	{
		path: 'practice',
		renderMode: RenderMode.Client,
	},
	{
		path: 'practice/:slug',
		renderMode: RenderMode.Client,
	},
	{
		path: 'sign-in',
		renderMode: RenderMode.Client,
	},
	{ path: '**', renderMode: RenderMode.Prerender },
];
