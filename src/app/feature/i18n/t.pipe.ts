import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService, I18nVars } from './i18n.service';

/**
 * `{{ 'Daily puzzle' | t }}`, `{{ '{count} game|{count} games' | t: { count: n } }}`.
 * Impure so it reads the translation signal on every check and follows language changes.
 */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
	private readonly _i18n = inject(I18nService);

	transform(text: string | null | undefined, vars?: I18nVars): string {
		return text ? this._i18n.t(text, vars) : '';
	}
}
