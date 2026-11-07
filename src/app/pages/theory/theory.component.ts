import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FiltersService, registerPageFilters } from '../../feature/filters/filters.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { pick, THEORY_MODULES, THEORY_TOPICS } from '../../feature/theory/theory.data';

/** The Learn page: every lesson in its module, narrowed by a search over titles and summaries. */
@Component({
	imports: [NgTemplateOutlet, RouterLink, TPipe],
	templateUrl: './theory.component.html',
})
export class TheoryComponent {
	private readonly _language = inject(I18nService).language;
	private readonly _route = inject(ActivatedRoute);

	protected readonly query = signal('');
	protected readonly total = THEORY_TOPICS.length;
	protected readonly pick = pick;
	protected readonly language = this._language;

	/** Modules with the lessons that match the search; modules without a match are left out. */
	protected readonly modules = computed(() => {
		const language = this._language();
		const needle = this.query().trim().toLowerCase();
		const matches = (text: { en: string; ua: string }) =>
			pick(text, language).toLowerCase().includes(needle);
		return THEORY_MODULES.map((module) => ({
			...module,
			topics: THEORY_TOPICS.filter(
				(topic) =>
					topic.module === module.slug &&
					(!needle || matches(topic.title) || matches(topic.summary)),
			),
		})).filter((module) => module.topics.length);
	});

	/** The one module whose lessons are on screen; none at first, which keeps the page light. */
	protected readonly openModule = signal<string | null>(null);

	/** A search shows every match, so it opens all the modules that have one. */
	protected isOpen(slug: string): boolean {
		return !!this.query().trim() || this.openModule() === slug;
	}

	/** Opens the module, closing the one that was open; a click on the open module closes it. */
	protected toggle(slug: string) {
		this.openModule.update((open) => (open === slug ? null : slug));
	}

	private readonly _filters = viewChild<TemplateRef<unknown>>('filters');
	protected readonly filtersService = inject(FiltersService);

	protected readonly shown = computed(() =>
		this.modules().reduce((sum, module) => sum + module.topics.length, 0),
	);

	constructor() {
		// on a phone the filters are in the top bar
		registerPageFilters(
			this._filters,
			computed(() => !!this.query()),
		);
		this._route.fragment.pipe(takeUntilDestroyed()).subscribe((slug) => {
			if (slug && THEORY_MODULES.some((module) => module.slug === slug))
				this.openModule.set(slug);
		});
	}
}
