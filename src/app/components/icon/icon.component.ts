import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONS, IconName } from './icon.data';

/**
 * Decorative icon. The light skin uses Solar (linear), the dark skin uses Iconoir;
 * both are rendered and CSS shows the one that matches the active mode.
 * The markup comes from static, trusted constants in icon.data.ts.
 */
@Component({
	selector: 'app-icon',
	template: `
		<span class="icon-solar" [innerHTML]="solar()" aria-hidden="true"></span>
		<span class="icon-iconoir" [innerHTML]="iconoir()" aria-hidden="true"></span>
	`,
	styles: `
		:host {
			display: inline-flex;
			width: 1.25rem;
			height: 1.25rem;
			font-size: 1.25rem;
			line-height: 1;
			flex: none;
		}
		span {
			display: inline-flex;
		}
		:host-context(html[data-mode='dark']) .icon-solar,
		:host-context(html:not([data-mode='dark'])) .icon-iconoir {
			display: none;
		}
	`,
})
export class IconComponent {
	private readonly _sanitizer = inject(DomSanitizer);

	readonly name = input.required<IconName>();

	protected readonly solar = computed(() =>
		this._sanitizer.bypassSecurityTrustHtml(ICONS[this.name()].solar),
	);
	protected readonly iconoir = computed(() =>
		this._sanitizer.bypassSecurityTrustHtml(ICONS[this.name()].iconoir),
	);
}
