import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { buildCanonicalUrl, CanonicalService } from '@wawjs/ngx-default';
import { filter, map, startWith } from 'rxjs';
import { FiltersService } from './feature/filters/filters.service';
import { IconComponent } from './components/icon/icon.component';
import { IconName } from './components/icon/icon.data';
import { companyProfile } from './feature/company/company.data';
import { AuthService, userPhoto } from './feature/auth/auth.service';
import { ReadingProgressService } from './feature/reading/reading-progress.service';
import { PracticeProgressService } from './feature/practice/practice-progress.service';
import { TPipe } from './feature/i18n/t.pipe';
import { LoadingService } from './feature/loading/loading.service';
import { SplashComponent } from './components/splash/splash.component';
import { BusinessRatingService } from './feature/rating/business-rating.service';
import { ShareService } from './feature/share/share.service';

/** The first part of the address to the name of the page, in English; the template translates it. */
const PAGE_NAMES: Record<string, string> = {
	glossary: 'Glossary',
	theories: 'Learn',
	theory: 'Learn',
	practices: 'Practice',
	practice: 'Practice',
	profile: 'Profile',
	'sign-in': 'Sign in',
	privacy: 'Privacy',
	licenses: 'Credits',
};

@Component({
	selector: 'app-root',
	imports: [
		SplashComponent,
		IconComponent,
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		NgOptimizedImage,
		TPipe,
	],
	template: `
		<app-splash />
		<div class="min-h-dvh bg-bg text-fg">
			<a
				class="sr-only-focusable fixed left-4 top-4 z-50 rounded-lg bg-brand p-3 text-brand-fg"
				href="#main"
				>Skip to content</a
			>
			<header class="border-b border-line">
				<div
					class="mx-auto flex max-w-6xl items-center justify-between gap-x-3 gap-y-2 flex-nowrap px-5 py-3 sm:px-8 md:py-4"
				>
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<a
							class="flex min-h-11 min-w-11 shrink-0 items-center gap-3 text-xl font-semibold tracking-tight"
							routerLink="/"
							aria-label="Business home"
						>
							<img ngSrc="/logo.png" width="40" height="40" priority alt="" /><span
								class="max-md:hidden"
								>Business</span
							>
						</a>
						<!-- on phones the page name takes the place of the menu, which sits in the bottom bar -->
						<span
							class="min-w-0 truncate text-base font-semibold tracking-tight md:hidden"
							>{{ pageName() | t }}</span
						>
					</div>
					<nav class="hidden gap-5 text-sm md:flex" aria-label="Main navigation">
						@for (link of links; track link.path) {
							<a
								class="inline-flex min-h-11 min-w-11 items-center"
								[routerLink]="link.path"
								[class.text-brand]="isActive(link.path)"
								[attr.aria-current]="isActive(link.path) ? 'page' : null"
								>{{ link.label | t }}</a
							>
						}
					</nav>
					<div
						class="flex shrink-0 items-center gap-2"
						[class.max-md:w-full]="filters.compact()"
						[class.max-md:justify-end]="filters.compact()"
					>
						@for (action of filters.actions(); track action.label) {
							<button
								class="flex size-11 shrink-0 items-center justify-center rounded-full border border-line disabled:opacity-40"
								type="button"
								[disabled]="action.disabled?.()"
								[attr.aria-label]="action.label | t"
								[attr.title]="action.label | t"
								(click)="action.run()"
							>
								<app-icon [name]="action.icon" />
							</button>
						}
						@if (filters.page(); as page) {
							<button
								class="relative flex size-11 items-center justify-center rounded-full border border-line md:hidden"
								type="button"
								aria-haspopup="dialog"
								[attr.aria-label]="'Filters' | t"
								[attr.title]="'Filters' | t"
								(click)="filters.open()"
							>
								<app-icon name="filter" />
								@if (page.active()) {
									<span
										class="absolute right-1 top-1 size-2.5 rounded-full bg-brand"
										aria-hidden="true"
									></span>
								}
							</button>
						}
						<button
							class="flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
							type="button"
							[attr.aria-label]="
								(sharing.copied() ? 'Link copied' : 'Share this page') | t
							"
							[attr.title]="
								(sharing.copied() ? 'Link copied' : 'Share this page') | t
							"
							(click)="sharing.share()"
						>
							<app-icon [name]="sharing.copied() ? 'check' : 'share'" />
						</button>
						<span class="sr-only" role="status">{{
							sharing.copied() ? ('Link copied' | t) : ''
						}}</span>
						@let elo = learner.rating();
						@if (!filters.compact()) {
							<a
								class="flex h-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line px-2.5 text-[0.6875rem] font-medium leading-tight tabular-nums no-underline sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3 sm:text-sm"
								routerLink="/profile"
								[attr.aria-label]="
									'Business Elo {rating}, {rank}'
										| t: { rating: elo.rating, rank: (elo.rank.name | t) }
								"
								[attr.title]="
									'Business Elo {rating} · {rank}'
										| t: { rating: elo.rating, rank: (elo.rank.name | t) }
								"
							>
								<span class="font-semibold text-brand">{{ elo.rating }}</span>
								<span class="text-mute">{{ elo.rank.name | t }}</span>
							</a>
						}
						<a
							class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-sm font-semibold"
							routerLink="/profile"
							routerLinkActive="border-brand text-brand"
							[attr.aria-label]="'Profile' | t"
							[attr.title]="'Profile' | t"
						>
							@if (photo(); as photo) {
								<img
									class="size-full object-cover"
									[src]="photo"
									alt=""
									referrerpolicy="no-referrer"
									width="40"
									height="40"
								/>
							} @else {
								<svg
									class="size-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<circle cx="12" cy="8" r="4" />
									<path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
								</svg>
							}
						</a>
					</div>
				</div>
			</header>
			<main
				id="main"
				tabindex="-1"
				class="mx-auto min-h-[75dvh] max-w-6xl px-5 pb-6 max-md:pb-20 sm:px-8"
			>
				<router-outlet />
			</main>
			<!-- the menu of the phone, as a bar at the bottom of the screen -->
			<nav
				class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
				aria-label="Main navigation"
			>
				<ul class="mx-auto grid max-w-md grid-cols-4">
					@for (link of links; track link.path) {
						<li>
							<a
								class="flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-xs font-medium text-mute no-underline aria-[current=page]:text-brand!"
								[routerLink]="link.path"
								[attr.aria-current]="isActive(link.path) ? 'page' : null"
							>
								<app-icon [name]="link.icon" />
								<!-- on a very narrow phone the name does not fit, so only the icon shows -->
								<span class="max-[339px]:sr-only">{{ link.label | t }}</span>
							</a>
						</li>
					}
				</ul>
			</nav>
		</div>
	`,
})
export class App {
	private readonly _auth = inject(AuthService);
	private readonly _router = inject(Router);
	protected readonly filters = inject(FiltersService);
	protected readonly user = this._auth.user;
	protected readonly photo = computed(() => userPhoto(this.user()));
	protected readonly sharing = inject(ShareService);
	protected readonly learner = inject(BusinessRatingService);

	protected readonly links: { path: string; label: string; icon: IconName }[] = [
		{ path: '/glossary', label: 'Glossary', icon: 'glossary' },
		{ path: '/theories', label: 'Learn', icon: 'study' },
		{ path: '/practices', label: 'Practice', icon: 'play' },
	];

	/** The name of the current page, for the top bar of the phone. */
	protected readonly pageName = toSignal(
		this._router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			startWith(null),
			map(
				() =>
					PAGE_NAMES[this._router.url.split(/[?#/]/).filter(Boolean)[0] ?? ''] ?? 'Business',
			),
		),
		{ initialValue: 'Business' },
	);

	private readonly _currentUrl = toSignal(
		this._router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map((event) => event.urlAfterRedirects),
		),
		{ initialValue: this._router.url },
	);

	protected isActive(path: string): boolean {
		const url = this._currentUrl().split(/[?#]/)[0];
		return url === path || url.startsWith(path + '/');
	}

	constructor() {
		// everyone is signed in as a guest after the first paint, and the saved results follow the user
		inject(PracticeProgressService);
		inject(ReadingProgressService);
		void inject(ShareService).listenForLinks();
		const loading = inject(LoadingService);
		// the spinner stays until the session and the saved results are restored
		afterNextRender(() => void this._auth.whenReady().finally(() => loading.bootDone()));
		inject(CanonicalService).initialize();
		const meta = inject(Meta);
		const router = inject(Router);
		const update = (url: string) => {
			const path = url.split(/[?#]/)[0];
			const image = companyProfile.pageSeo?.[path]?.image ?? companyProfile.defaultSeo.image;
			const label = image.includes('practice')
				? 'Business practice'
				: image.includes('theory')
					? 'Business theories'
					: image.includes('privacy')
						? 'Privacy'
						: image.includes('licenses')
							? 'Licenses and credits'
							: 'Learn to build and manage companies';
			const alt = 'Business: ' + label;
			meta.updateTag({ property: 'og:image:alt', content: alt });
			meta.updateTag({ name: 'twitter:image:alt', content: alt });
			meta.updateTag({
				property: 'og:url',
				content: buildCanonicalUrl(companyProfile.siteUrl, url),
			});
		};
		update(router.url);
		router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed(),
			)
			.subscribe((event) => update(event.urlAfterRedirects));
	}
}
