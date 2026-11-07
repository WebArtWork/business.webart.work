import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { companyProfile } from '../company/company.data';

/**
 * Shares the current page by its public website URL, also from inside the native app (whose own origin is local).
 * With App Links / Universal Links set up, that URL opens the app when it is installed, and the site otherwise.
 */
@Service()
export class ShareService {
	private readonly _router = inject(Router);
	private readonly _document = inject(DOCUMENT);
	private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
	private _copiedTimer?: ReturnType<typeof setTimeout>;

	/** True for a moment after the link was copied, where no share sheet exists (most desktop browsers). */
	readonly copied = signal(false);

	/** A page that shares something other than its own address (a system's read-only link) sets this. */
	readonly custom = signal<(() => void) | null>(null);

	/** The public URL of the page on screen, query included (a shared position keeps its ?fen=). */
	url(): string {
		return companyProfile.siteUrl + this._router.url;
	}

	/** Call straight from the click: browsers allow sharing and copying only during the tap itself. */
	share() {
		const custom = this.custom();
		if (custom) return custom();
		this.shareLink(this.url(), this._document.title);
	}

	/** The public URL of a path of the site, such as `/shared/<id>`. */
	urlOf(path: string): string {
		return companyProfile.siteUrl + path;
	}

	/** Shares or copies any link, with the same fallbacks as `share()`. */
	shareLink(url: string, title: string) {
		if (!this._isBrowser) return;
		if (_isNative()) {
			// the native sheet needs no tap; loaded on use, to keep the plugin out of the first download
			void import('@capacitor/share').then(({ Share }) => Share.share({ title, url, dialogTitle: title })).catch(() => {});
		} else if (navigator.share) {
			// closing the sheet is a choice, not a failure; anything else falls back to copying
			navigator.share({ title, url }).catch((error) => !_isCancel(error) && this._copy(url));
		} else {
			this._copy(url);
		}
	}

	private _copy(url: string) {
		const done = () => {
			this.copied.set(true);
			clearTimeout(this._copiedTimer);
			this._copiedTimer = setTimeout(() => this.copied.set(false), 2000);
		};
		navigator.clipboard.writeText(url).then(done, () => _legacyCopy(this._document, url) && done());
	}

	/** In the native app, opens shared website links (App Links / Universal Links) on the matching page. */
	async listenForLinks() {
		if (!this._isBrowser || !_isNative()) return;
		const { App } = await import('@capacitor/app');
		void App.addListener('appUrlOpen', ({ url }) => this._open(url));
		// a link that launched a closed app
		void App.getLaunchUrl().then((launch) => launch?.url && this._open(launch.url));
	}

	private _open(url: string) {
		const link = new URL(url);
		if (link.host === new URL(companyProfile.siteUrl).host) {
			void this._router.navigateByUrl(link.pathname + link.search + link.hash);
		}
	}
}

/** The Capacitor bridge sets window.Capacitor inside the app; checked without loading @capacitor/core. */
function _isNative(): boolean {
	return !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

function _isCancel(error: unknown): boolean {
	return (error as { name?: string })?.name === 'AbortError';
}

/** For browsers that refuse the Clipboard API (insecure origin, embedded views). */
function _legacyCopy(document: Document, text: string): boolean {
	const field = document.createElement('textarea');
	field.value = text;
	field.setAttribute('readonly', '');
	field.style.position = 'fixed';
	field.style.opacity = '0';
	document.body.append(field);
	field.select();
	try {
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		field.remove();
	}
}
