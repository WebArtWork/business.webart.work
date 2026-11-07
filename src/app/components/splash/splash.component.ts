import { afterNextRender, Component, inject, signal } from '@angular/core';
import { LoadingService } from '../../feature/loading/loading.service';
import { TPipe } from '../../feature/i18n/t.pipe';

/** The full-screen spinner: on top of everything while the app starts or a slow step runs. */
@Component({
	selector: 'app-splash',
	imports: [TPipe],
	template: `
		@if (hydrated() && loading.visible()) {
			<div
				class="splash fixed inset-0 z-[100] flex items-center justify-center bg-bg"
				role="status"
				aria-live="polite"
			>
				<span class="spinner" aria-hidden="true"></span>
				<span class="sr-only">{{ 'Loading' | t }}</span>
			</div>
		}
	`,
})
export class SplashComponent {
	protected readonly loading = inject(LoadingService);
	protected readonly hydrated = signal(false);

	constructor() {
		afterNextRender(() => this.hydrated.set(true));
	}
}
