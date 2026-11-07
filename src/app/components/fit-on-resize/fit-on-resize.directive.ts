import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, output, PLATFORM_ID } from '@angular/core';

/**
 * Tells when the element changed size (a window resize, a phone turned around), once the change settles, so
 * the canvas inside can fit itself to the new room again.
 */
@Directive({ selector: '[appFitOnResize]' })
export class FitOnResizeDirective {
	readonly resized = output<void>();

	constructor() {
		if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
		const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let first = true;
		const observer = new ResizeObserver(() => {
			// the first call is the observer starting, not a change
			if (first) return void (first = false);
			clearTimeout(timer);
			timer = setTimeout(() => this.resized.emit(), 150);
		});
		observer.observe(element);
		inject(DestroyRef).onDestroy(() => {
			clearTimeout(timer);
			observer.disconnect();
		});
	}
}
