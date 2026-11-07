import { Component, computed, input } from '@angular/core';
import { LinkedTextComponent } from '../linked-text/linked-text.component';

/**
 * Lesson text in which `**term**` is shown bold; glossary terms stay links (see `app-linked`).
 * The template has no whitespace between its pieces, so it never adds a space to the text.
 */
@Component({
	selector: 'app-rich',
	imports: [LinkedTextComponent],
	// prettier-ignore
	template: `@for (part of parts(); track $index) {@if ($odd) {<strong class="font-semibold text-fg"><app-linked [text]="part" /></strong>} @else {<app-linked [text]="part" />}}`,
})
export class RichTextComponent {
	readonly text = input.required<string>();

	/** The text split at every `**`: the odd pieces are the bold ones. */
	protected readonly parts = computed(() => this.text().split('**'));
}
