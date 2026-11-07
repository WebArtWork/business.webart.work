import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '@wawjs/ngx-ui';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { IconComponent } from '../icon/icon.component';

/** Interface preferences, shown on the sign-in and profile pages. */
@Component({
	selector: 'app-preferences',
	imports: [IconComponent, TPipe],
	template: `
		<section class="flex flex-col gap-3" aria-labelledby="appearance-title">
			<h2 id="appearance-title" class="text-sm font-medium text-mute">{{ 'Appearance' | t }}</h2>
			<div class="flex gap-2" role="group" [attr.aria-label]="'Appearance' | t">
				<button class="ds-chip h-11 px-4" type="button" [attr.aria-pressed]="!isDark()" (click)="set('light')">
					<app-icon name="sun" />
					{{ 'Light' | t }}
				</button>
				<button class="ds-chip h-11 px-4" type="button" [attr.aria-pressed]="isDark()" (click)="set('dark')">
					<app-icon name="moon" />
					{{ 'Dark' | t }}
				</button>
			</div>
		</section>

		<section class="mt-8 flex flex-col gap-3" aria-labelledby="language-title">
			<h2 id="language-title" class="text-sm font-medium text-mute">{{ 'Language' | t }}</h2>
			<div class="flex gap-2" role="group" [attr.aria-label]="'Language' | t">
				@for (language of i18n.languages; track language.code) {
					<button
						class="ds-chip h-11 px-4"
						type="button"
						[attr.lang]="language.htmlLang"
						[attr.aria-pressed]="i18n.language() === language.code"
						(click)="i18n.setLanguage(language.code)"
					>
						<app-icon name="globe" />
						{{ language.nativeName }}
					</button>
				}
			</div>
		</section>
	`,
})
export class PreferencesComponent {
	private readonly _theme = inject(ThemeService);
	protected readonly i18n = inject(I18nService);

	protected readonly isDark = computed(() => this._theme.mode() === 'dark');

	protected set(mode: 'light' | 'dark') {
		this._theme.setMode(mode);
	}
}
