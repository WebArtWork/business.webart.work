import { DestroyRef, effect, inject, Service, signal, Signal, TemplateRef } from '@angular/core';
import { ModalService } from '@wawjs/ngx-ui';
import { IconName } from '../../components/icon/icon.data';
import { TemplateModalComponent } from '../../components/template-modal/template-modal.component';
import { FiltersModalComponent } from '../../components/filters-modal/filters-modal.component';

/** The filters of the page on screen: their template, and whether any of them is switched on. */
interface PageFilters {
	/** Tells apart a page from the one that replaced it, so a page being left never clears the new page's filters. */
	owner: object;
	template: TemplateRef<unknown>;
	active: Signal<boolean>;
}

/** A button a page puts in the top bar. */
interface PageAction {
	owner: object;
	label: string;
	icon: IconName;
	run: () => void;
	/** True while the button does nothing. */
	disabled?: Signal<boolean>;
}

/**
 * The filters of a page. On a phone they leave the page for a button in the top bar, which opens them in a
 * modal; the page keeps one template of its filters and shows it inline on larger screens.
 */
@Service()
export class FiltersService {
	private readonly _modal = inject(ModalService);
	private _open: { close?: () => void } | null = null;

	/** True while the top bar needs the room: the rating is hidden. */
	readonly compact = signal(false);

	/** The buttons the page on screen has in the top bar. */
	readonly actions = signal<PageAction[]>([]);

	/** Set while the page on screen has filters. */
	readonly page = signal<PageFilters | null>(null);

	open() {
		const page = this.page();
		if (!page || this._open) return;
		this._open = this._modal.show({
			component: FiltersModalComponent,
			size: 'small',
			template: page.template,
			ariaLabelledBy: 'filters-title',
			onClose: () => (this._open = null),
		});
	}

	/** Shows a page's template in a modal under `title`; used by the buttons of the top bar. */
	showTemplate(template: TemplateRef<unknown>, title: string) {
		this._open = this._modal.show({
			component: TemplateModalComponent,
			size: 'small',
			template,
			title,
			ariaLabelledBy: 'template-modal-title',
			onClose: () => (this._open = null),
		});
	}

	close() {
		this._open?.close?.();
	}
}

/**
 * Called from a page's constructor: hands the template of its filters (a `viewChild` of an `<ng-template>`)
 * to the top bar. The registration ends with the page.
 */
export function registerPageFilters(template: Signal<TemplateRef<unknown> | undefined>, active: Signal<boolean>) {
	const filters = inject(FiltersService);
	const owner = {};
	effect(() => {
		const ref = template();
		if (ref) filters.page.set({ owner, template: ref, active });
	});
	inject(DestroyRef).onDestroy(() => {
		if (filters.page()?.owner === owner) filters.page.set(null);
		filters.close();
	});
}

/**
 * Called from a page's constructor: puts buttons in the top bar for as long as the page lives (a signal's
 * buttons follow it). `compact` also hides the rating there, to leave the room to the buttons.
 */
export function registerPageActions(actions: Omit<PageAction, 'owner'>[] | Signal<Omit<PageAction, 'owner'>[]>, compact = false) {
	const filters = inject(FiltersService);
	const owner = {};
	effect(() => {
		const list = typeof actions === 'function' ? actions() : actions;
		filters.actions.set(list.map((action) => ({ ...action, owner })));
	});
	if (compact) filters.compact.set(true);
	inject(DestroyRef).onDestroy(() => {
		if (filters.actions()[0]?.owner === owner || !filters.actions().length) filters.actions.set([]);
		if (compact) filters.compact.set(false);
	});
}
