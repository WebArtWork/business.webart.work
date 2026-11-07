import { computed, Service, signal } from '@angular/core';

/**
 * The full-screen spinner. It covers the page from the first paint until the session is restored, and for
 * any slow step after that (`track`). Several steps can overlap; the screen clears when the last one ends.
 */
@Service()
export class LoadingService {
	private readonly _booting = signal(true);
	private readonly _busy = signal(0);

	/** True while the app starts or a tracked step runs. */
	readonly visible = computed(() => this._booting() || this._busy() > 0);

	/** The app has what it needs to show real content. */
	bootDone() {
		this._booting.set(false);
	}

	/** Shows the spinner while `work` runs; gives the spinner a frame to appear before heavy work starts. */
	async track<T>(work: () => T | Promise<T>): Promise<T> {
		this._busy.update((n) => n + 1);
		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 30));
			return await work();
		} finally {
			this._busy.update((n) => n - 1);
		}
	}
}
