import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { registerPageFilters } from '../../feature/filters/filters.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import glossary from '../../../data/glossary/glossary.json';

interface Localized {
	en: string;
	ua: string;
}

interface GlossarySection {
	id: string;
	title: Localized;
}

interface GlossaryTerm {
	section: string;
	term: Localized;
	def: Localized;
	starter: boolean;
}

const SECTIONS = glossary.sections as GlossarySection[];
const TERMS = glossary.terms as GlossaryTerm[];

/** The Glossary page: every term in its category, narrowed by search, a category or the 40 starter terms. */
@Component({
	imports: [NgTemplateOutlet, TPipe],
	templateUrl: './glossary.component.html',
})
export class GlossaryComponent {
	protected readonly language = inject(I18nService).language;

	/** A term linked from a lesson arrives as ?term=, already in the search box. */
	protected readonly query = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('term') ?? '');
	protected readonly section = signal<string | null>(null);
	/** The one category whose terms are on screen; none at first, which keeps the page light. */
	protected readonly openGroup = signal<string | null>(null);
	protected readonly starterOnly = signal(false);

	protected readonly sections = SECTIONS;
	protected readonly total = TERMS.length;
	protected readonly starters = TERMS.filter((term) => term.starter).length;

	protected readonly groups = computed(() => {
		const needle = this.query().trim().toLowerCase();
		const language = this.language() === 'ua' ? 'ua' : 'en';
		const section = this.section();
		const starterOnly = this.starterOnly();
		return SECTIONS.filter((item) => !section || item.id === section)
			.map((item) => ({
				...item,
				terms: TERMS.filter(
					(term) =>
						term.section === item.id &&
						(!starterOnly || term.starter) &&
						(!needle ||
							term.term.en.toLowerCase().includes(needle) ||
							term.term.ua.toLowerCase().includes(needle) ||
							term.def[language].toLowerCase().includes(needle)),
				),
			}))
			.filter((item) => item.terms.length);
	});

	private readonly _filters = viewChild<TemplateRef<unknown>>('filters');

	protected readonly shown = computed(() => this.groups().reduce((sum, group) => sum + group.terms.length, 0));

	constructor() {
		// on a phone the filters are in the top bar
		registerPageFilters(this._filters, computed(() => !!this.query() || !!this.section() || this.starterOnly()));
	}

	protected title(item: { title: Localized }): string {
		return this.language() === 'ua' ? item.title.ua : item.title.en;
	}

	/** The term in the page language; in Ukrainian the English term follows, since code and docs use it. */
	protected name(term: GlossaryTerm): string {
		return this.language() === 'ua' ? term.term.ua : term.term.en;
	}

	protected definition(term: GlossaryTerm): string {
		return this.language() === 'ua' ? term.def.ua : term.def.en;
	}

	/** A search or a filter shows every match, so it opens all the categories that have one. */
	protected isOpen(id: string): boolean {
		return !!this.query().trim() || !!this.section() || this.starterOnly() || this.openGroup() === id;
	}

	/** Opens the category, closing the one that was open; a click on the open category closes it. */
	protected toggle(id: string) {
		this.openGroup.update((open) => (open === id ? null : id));
	}

	protected pickSection(id: string | null) {
		this.section.set(this.section() === id ? null : id);
	}
}
