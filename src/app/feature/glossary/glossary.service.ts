import { inject, Service, signal } from '@angular/core';
import { ModalService } from '@wawjs/ngx-ui';
import { GlossaryModalComponent } from '../../components/glossary-modal/glossary-modal.component';

export type GlossaryLanguage = 'en' | 'ua';

interface Localized {
	en: string;
	ua: string;
}

export interface GlossaryEntry {
	id: string;
	term: Localized;
	def: Localized;
}

/** A piece of text; `id` is set on the pieces that are a glossary term. */
export interface Segment {
	text: string;
	id?: string;
}

interface Matcher {
	pattern: RegExp;
	/** Lower-case spelling of a match, or its stem, to the entry it belongs to. */
	words: Map<string, string>;
	stems: [string, string][];
}

interface GlossaryIndex {
	byId: Map<string, GlossaryEntry>;
	matchers: Record<GlossaryLanguage, Matcher>;
}

/** Everyday words that would be linked on every line; the glossary page still lists them. */
const TOO_COMMON = new Set(['code', 'program', 'programming', 'software', 'hardware', 'user', 'feature', 'requirement', 'number']);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The glossary terms, found in text so the lessons and exercises can link them to their explanation. */
@Service()
export class GlossaryService {
	readonly index = signal<GlossaryIndex | null>(null);
	private readonly _modal = inject(ModalService);
	private _loading: Promise<GlossaryIndex> | null = null;

	/** Loads the glossary once; routes wait for it so the prerendered pages already hold the links. */
	load(): Promise<GlossaryIndex> {
		this._loading ??= import('../../../data/glossary/glossary.json').then((module) => {
			const index = buildIndex(module.default.terms as { term: Localized; def: Localized }[]);
			this.index.set(index);
			return index;
		});
		return this._loading;
	}

	async open(id: string) {
		const entry = (await this.load()).byId.get(id);
		if (entry) {
			this._modal.show({ component: GlossaryModalComponent, size: 'small', entry, ariaLabelledBy: 'glossary-modal-title' });
		}
	}

	/** Splits text into plain pieces and terms; a term is linked at its first place in the text only. */
	segments(text: string, language: GlossaryLanguage): Segment[] {
		const matcher = this.index()?.matchers[language];
		if (!matcher || !text) return [{ text }];

		const result: Segment[] = [];
		const linked = new Set<string>();
		let last = 0;
		for (const match of text.matchAll(matcher.pattern)) {
			const id = lookup(matcher, match[0]);
			if (!id || linked.has(id)) continue;
			linked.add(id);
			if (match.index > last) result.push({ text: text.slice(last, match.index) });
			result.push({ text: match[0], id });
			last = match.index + match[0].length;
		}
		if (last < text.length) result.push({ text: text.slice(last) });
		return result.length ? result : [{ text }];
	}
}

function lookup(matcher: Matcher, found: string): string | undefined {
	const word = found.toLowerCase();
	const exact = matcher.words.get(word) ?? matcher.words.get(word.replace(/e?s$/, ''));
	if (exact) return exact;
	return matcher.stems.find(([stem]) => word.startsWith(stem))?.[1];
}

function slug(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Spellings of a term: "Application (app)" is also found as "app"; "Баг, помилка" as either word. */
function variants(text: string): string[] {
	const parts: string[] = [];
	for (const piece of text.split(',')) {
		const match = piece.trim().match(/^(.*?)\s*\((.+)\)$/);
		parts.push(match ? match[1] : piece.trim());
		if (match) parts.push(match[2]);
	}
	return parts.filter((part) => part.length > 2);
}

function buildIndex(terms: { term: Localized; def: Localized }[]): GlossaryIndex {
	const byId = new Map<string, GlossaryEntry>();
	const spellings: Record<GlossaryLanguage, Map<string, string>> = { en: new Map(), ua: new Map() };
	const stems: Record<GlossaryLanguage, [string, string][]> = { en: [], ua: [] };

	for (const item of terms) {
		const id = slug(item.term.en);
		if (TOO_COMMON.has(id)) continue;
		byId.set(id, { id, term: item.term, def: item.def });
		for (const language of ['en', 'ua'] as const) {
			for (const variant of variants(item.term[language])) {
				const word = variant.toLowerCase();
				if (!spellings[language].has(word)) spellings[language].set(word, id);
				// Ukrainian words change their endings: one word of six letters or more is matched by its stem
				if (language === 'ua' && !word.includes(' ') && word.length >= 6) stems.ua.push([word.slice(0, -1), id]);
			}
		}
	}

	const matcher = (language: GlossaryLanguage): Matcher => {
		const words = spellings[language];
		const alternatives = [...words.keys()]
			.sort((a, b) => b.length - a.length)
			.map((word) => escape(word) + (language === 'en' ? '(?:e?s)?' : ''))
			.concat(language === 'ua' ? stems.ua.map(([stem]) => escape(stem) + '\\p{L}{0,3}') : []);
		const pattern = new RegExp(`(?<![\\p{L}\\p{N}_-])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
		return { pattern, words, stems: stems[language] };
	};

	return { byId, matchers: { en: matcher('en'), ua: matcher('ua') } };
}
