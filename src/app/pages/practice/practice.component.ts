import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { registerPageFilters } from '../../feature/filters/filters.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { PracticeProgressService } from '../../feature/practice/practice-progress.service';
import { PRACTICE_TOPICS, TOTAL_POINTS } from '../../feature/practice/practice.data';
import { pick, THEORY_MODULES } from '../../feature/theory/theory.data';

/**
 * The Practice page: the exercises of every lesson with the best result so far, in one searchable list.
 */
@Component({
	imports: [NgTemplateOutlet, RouterLink, TPipe],
	templateUrl: './practice.component.html',
})
export class PracticeComponent {
	private readonly _language = inject(I18nService).language;
	private readonly _progress = inject(PracticeProgressService);

	/** The one lesson module whose practices are on screen; none at first, which keeps the page light. */
	protected readonly openKey = signal<string | null>(null);

	/** A search shows every match, so it opens all the groups that have one. */
	protected isOpen(key: string): boolean {
		return !!this.query().trim() || this.openKey() === key;
	}

	/** Opens the group, closing the one that was open; a click on the open group closes it. */
	protected toggle(key: string) {
		this.openKey.update((open) => (open === key ? null : key));
	}

	private readonly _filters = viewChild<TemplateRef<unknown>>('filters');
	protected readonly query = signal('');
	protected readonly total = PRACTICE_TOPICS.length;
	protected readonly maxPoints = TOTAL_POINTS;
	protected readonly pick = pick;
	protected readonly language = this._language;

	protected readonly modules = computed(() => {
		const language = this._language();
		const needle = this.query().trim().toLowerCase();
		const scores = this._progress.scores();
		return THEORY_MODULES.map((module) => ({
			...module,
			topics: PRACTICE_TOPICS.filter(
				(topic) => topic.module === module.slug && (!needle || pick(topic.title, language).toLowerCase().includes(needle)),
			).map((topic) => ({ ...topic, score: scores[topic.slug] })),
		})).filter((module) => module.topics.length);
	});

	protected readonly shown = computed(
		() => this.modules().reduce((sum, module) => sum + module.topics.length, 0),
	);

	constructor() {
		// on a phone the search is in the top bar
		registerPageFilters(this._filters, computed(() => !!this.query()));
	}

}
