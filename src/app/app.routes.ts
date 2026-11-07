import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { buildRouteMeta } from '@wawjs/ngx-default';
import { companyProfile } from './feature/company/company.data';
import { guestGuard } from './feature/auth/auth.guard';
import { GlossaryService } from './feature/glossary/glossary.service';
import { loadQuestions, PRACTICE_TOPICS } from './feature/practice/practice.data';
import { loadTopic, THEORY_TOPICS } from './feature/theory/theory.data';

const loadComponent = () =>
	import('./pages/home/home.component').then((m) => m.HomeComponent);
const page = (path: string, mode: string, extra: Record<string, unknown> = {}) => ({
	mode,
	meta: buildRouteMeta(companyProfile, path),
	...extra,
});
const infoPage = (path: string, title: string, paragraphs: string[]) => ({
	path,
	loadComponent,
	data: page('/' + path, path, { info: { title, paragraphs } }),
});

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		loadComponent,
		data: page('/', 'home', {
			meta: {
				...buildRouteMeta(companyProfile, '/'),
				title: companyProfile.title,
				titleSuffix: '',
			},
		}),
	},
	{
		path: 'theories',
		loadComponent: () => import('./pages/theory/theory.component').then((m) => m.TheoryComponent),
		data: page('/theories', 'theory'),
	},
	...THEORY_TOPICS.map(
		(topic): Routes[number] => ({
			path: 'theories/' + topic.slug,
			loadComponent: () =>
				import('./pages/theory-lesson/theory-lesson.component').then((m) => m.TheoryLessonComponent),
			resolve: { topic: () => loadTopic(topic.slug), glossary: () => inject(GlossaryService).load() },
			data: page('/theories/' + topic.slug, 'lesson'),
		}),
	),
	{
		path: 'practices',
		loadComponent: () => import('./pages/practice/practice.component').then((m) => m.PracticeComponent),
		data: page('/practices', 'practice'),
	},
	...PRACTICE_TOPICS.map(
		(topic): Routes[number] => ({
			path: 'practices/' + topic.slug,
			loadComponent: () => import('./pages/exercise/exercise.component').then((m) => m.ExerciseComponent),
			resolve: { set: () => loadQuestions(topic.slug), glossary: () => inject(GlossaryService).load() },
			data: page('/practices/' + topic.slug, 'exercise'),
		}),
	),
	{
		path: 'glossary',
		loadComponent: () => import('./pages/glossary/glossary.component').then((m) => m.GlossaryComponent),
		data: page('/glossary', 'glossary'),
	},
	{
		path: 'privacy',
		loadComponent: () => import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
		data: page('/privacy', 'privacy'),
	},
	infoPage('licenses', 'Licenses and credits', [
		'This project is licensed under GPL-3.0-or-later. Third-party software retains its own license terms. The distribution includes third-party license notices.',
		'The lessons and exercises are original learning material; the further reading links point to the sources of each topic.',
	]),
	// links from before the rename keep working
	{ path: 'theory', redirectTo: 'theories', pathMatch: 'full' },
	{ path: 'theory/:slug', redirectTo: 'theories/:slug' },
	{ path: 'practice', redirectTo: 'practices', pathMatch: 'full' },
	{ path: 'practice/:slug', redirectTo: 'practices/:slug' },
	{
		path: 'sign-in',
		canActivate: [guestGuard],
		loadComponent: () => import('./pages/sign-in/sign-in.component').then((m) => m.SignInComponent),
		data: { meta: { title: 'Sign in', robots: 'noindex, nofollow' } },
	},
	{
		path: 'profile',
		loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
		data: { meta: { title: 'Profile', robots: 'noindex, nofollow' } },
	},
	{ path: 'dashboard', redirectTo: '', pathMatch: 'full' },
	{
		path: '**',
		loadComponent,
		data: {
			mode: 'not-found',
			meta: { title: 'Page not found', robots: 'noindex, follow' },
			info: {
				title: 'This learning page has moved',
				paragraphs: [
					'Explore the lessons and practice exercises to find the topic you are looking for.',
				],
			},
		},
	},
];
