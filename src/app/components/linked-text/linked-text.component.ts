import { Component, computed, inject, input } from '@angular/core';
import { GlossaryService } from '../../feature/glossary/glossary.service';
import { I18nService } from '../../feature/i18n/i18n.service';

/**
 * Text in which the glossary terms are links; a click opens the term's explanation in a modal.
 * The template has no whitespace between its pieces, so a link never adds a space to the text around it.
 */
@Component({
	selector: 'app-linked',
	// prettier-ignore
	template: `@for (segment of segments(); track $index) {@if (segment.id; as id) {<button class="glossary-term" type="button" aria-haspopup="dialog" (click)="open(id)">{{ segment.text }}</button>} @else {{{ segment.text }}}}`,
})
export class LinkedTextComponent {
	private readonly _glossary = inject(GlossaryService);
	private readonly _language = inject(I18nService).language;

	readonly text = input.required<string>();

	protected readonly segments = computed(() =>
		this._glossary.segments(this.text(), this._language() === 'ua' ? 'ua' : 'en'),
	);

	protected open(id: string) {
		void this._glossary.open(id);
	}
}
