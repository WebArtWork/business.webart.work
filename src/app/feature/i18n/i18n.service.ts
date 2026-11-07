import { effect, inject, Service } from '@angular/core';
import { LanguageService, TranslateService } from '@wawjs/ngx-translate';
import { environment } from '../../../environments/environment';

export type I18nVars = Record<string, string | number | null | undefined>;

/**
 * The app's texts in the active language. English is the source: every text is written in English in
 * the code and looked up in /i18n/<language>.json (or a page bundle, see usePage). Placeholders are
 * `{name}`; a text with `|` is a plural, `"{count} game|{count} games"`, picked by `vars.count`.
 */
@Service()
export class I18nService {
	private readonly _translate = inject(TranslateService);
	readonly language = inject(LanguageService).language;
	readonly languages = environment.languages;

	/** The text in the active language. Reads a signal, so templates and computeds follow language changes. */
	t(text: string, vars?: I18nVars): string {
		let value = this._translate.translate(text)();
		if (value.includes('|') && vars && typeof vars['count'] === 'number') {
			value = pluralForm(value, vars['count'], this.language());
		}
		return vars ? fill(value, vars) : value;
	}

	setLanguage(code: string): Promise<void> {
		return this._translate.setLanguage(code);
	}

	/**
	 * Loads a page's own translations from `<folder><language>.json`, now and on every language change.
	 * Call from a component constructor; for long texts that only one page shows, like a theory lesson.
	 */
	usePage(folder: string): void {
		effect(() => void this.loadPage(folder, this.language()));
	}

	/** Loads one page bundle for a language, for a page that only learns which one it needs after it loads. */
	async loadPage(folder: string, language: string | undefined): Promise<void> {
		if (!language || language === environment.defaultLanguage) return;
		// the base file first, so the page texts are merged into it rather than overwritten by it
		await this._translate.loadTranslations(language);
		await this._translate.loadExtraTranslation(folder, { language });
	}
}

/** Plural forms per language, in the order the translation lists them. */
const PLURAL_ORDER: Record<string, Intl.LDMLPluralRule[]> = {
	en: ['one', 'other'],
	uk: ['one', 'few', 'many'],
};

function pluralForm(text: string, count: number, language: string): string {
	const locale = environment.languages.find((item) => item.code === language)?.htmlLang ?? 'en';
	const forms = text.split('|');
	const order = PLURAL_ORDER[locale] ?? PLURAL_ORDER['en'];
	const index = order.indexOf(new Intl.PluralRules(locale).select(count));
	return forms[index < 0 ? forms.length - 1 : Math.min(index, forms.length - 1)];
}

function fill(text: string, vars: I18nVars): string {
	return text.replace(/\{(\w+)\}/g, (match, key: string) => {
		const value = vars[key];
		return value === undefined ? match : String(value ?? '');
	});
}
