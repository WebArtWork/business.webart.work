import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { AuthService } from '../../feature/auth/auth.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { Localized, pick, THEORY_MODULES, THEORY_TOPICS } from '../../feature/theory/theory.data';

/** The home page, the plain information pages and the not-found page. Translations: /i18n/pages/home/. */
@Component({
	imports: [DashboardComponent, RouterLink, NgOptimizedImage, TPipe],
	templateUrl: './architecture.component.html',
})
export class ArchitectureComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly _i18n = inject(I18nService);
	protected readonly mode: string = this.route.snapshot.data['mode'];
	private readonly _user = inject(AuthService).user;
	/** Someone signed in with Google gets the dashboard in place of the landing page; a guest sees the landing page. */
	protected readonly member = computed(() => {
		const user = this._user();
		return !!user && !user.isAnonymous;
	});
	protected readonly modules = THEORY_MODULES;
	protected readonly topicCount = THEORY_TOPICS.length;
	protected readonly info = this.route.snapshot.data['info'] as
		| { title: string; paragraphs: string[] }
		| undefined;

	constructor() {
		this._i18n.usePage('/i18n/pages/home/');
	}

	/** A module's text in the active language. */
	protected pick(text: Localized): string {
		return pick(text, this._i18n.language());
	}
}
