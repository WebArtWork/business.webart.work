import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GlossaryEntry } from '../../feature/glossary/glossary.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';

/**
 * The explanation of a glossary term, shown in the ngx-ui modal (see GlossaryService.open).
 * ModalService sets `entry` and `close` on the instance, as it does for its own confirm dialog.
 */
@Component({
	selector: 'app-glossary-modal',
	imports: [RouterLink, TPipe],
	template: `
		<div class="flex flex-col gap-4">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{{ 'Glossary' | t }}</p>
				<h2 id="glossary-modal-title" class="mt-2 text-2xl font-semibold">
					{{ language() === 'ua' ? entry.term.ua : entry.term.en }}
				</h2>
				@if (language() === 'ua') {
					<p class="text-sm text-mute" lang="en">{{ entry.term.en }}</p>
				}
			</div>
			<p class="leading-relaxed text-fg/80">{{ language() === 'ua' ? entry.def.ua : entry.def.en }}</p>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<a [routerLink]="['/glossary']" [queryParams]="{ term: entry.term.en }" (click)="close()">{{ 'Open in the glossary' | t }} →</a>
				<button class="ds-btn ds-btn-primary" type="button" (click)="close()">{{ 'Close' | t }}</button>
			</div>
		</div>
	`,
})
export class GlossaryModalComponent {
	protected readonly language = inject(I18nService).language;

	entry!: GlossaryEntry;
	close!: () => void;
}
