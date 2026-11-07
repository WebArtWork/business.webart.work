import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { TPipe } from '../../feature/i18n/t.pipe';

/**
 * A page's template in the ngx-ui modal (see FiltersService.showTemplate). ModalService sets `template`,
 * `title` and `close` on the instance; the template still belongs to the page, so its controls stay live.
 */
@Component({
	selector: 'app-template-modal',
	imports: [NgTemplateOutlet, TPipe],
	template: `
		<div class="flex flex-col gap-4">
			<h2 id="template-modal-title" class="text-xl font-semibold">{{ title | t }}</h2>
			<ng-container *ngTemplateOutlet="template" />
		</div>
	`,
})
export class TemplateModalComponent {
	template!: TemplateRef<unknown>;
	title = '';
	close!: () => void;
}
