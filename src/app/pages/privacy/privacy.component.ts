import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { CONTACT_EMAIL } from '../../feature/legal/legal.const';

/**
 * The privacy policy. Keep it in step with what the app stores: the account feature
 * (src/app/feature/account), firestore.rules and the browser storage used for language and theme.
 * Its translations live in /i18n/pages/privacy/.
 */
@Component({
	imports: [RouterLink, TPipe],
	templateUrl: './privacy.component.html',
})
export class PrivacyComponent {
	protected readonly updated = '7 November 2026';
	protected readonly email = CONTACT_EMAIL;

	constructor() {
		inject(I18nService).usePage('/i18n/pages/privacy/');
	}
}
