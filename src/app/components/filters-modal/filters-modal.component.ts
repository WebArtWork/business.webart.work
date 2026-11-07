import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { TPipe } from '../../feature/i18n/t.pipe';

/**
 * The filters of a page in the ngx-ui modal (see FiltersService.open). ModalService sets `template` and
 * `close` on the instance; the template still belongs to the page, so the controls stay live.
 */
@Component({
	selector: 'app-filters-modal',
	imports: [NgTemplateOutlet, TPipe],
	template: `
		<div class="flex flex-col gap-5">
			<h2 id="filters-title" class="text-xl font-semibold">{{ 'Filters' | t }}</h2>
			<div class="flex flex-col gap-5">
				<ng-container *ngTemplateOutlet="template" />
			</div>
			<button class="ds-btn ds-btn-primary self-end" type="button" (click)="close()">
				{{ 'Show results' | t }}
			</button>
		</div>
	`,
})
export class FiltersModalComponent {
	template!: TemplateRef<unknown>;
	close!: () => void;
}
