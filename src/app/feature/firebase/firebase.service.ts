import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

/**
 * Initializes Firebase lazily and in the browser only. The SDK is a separate chunk,
 * so it stays out of the initial bundle, and prerender never touches the network.
 */
@Service()
export class FirebaseService {
	private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

	private _app: Promise<import('firebase/app').FirebaseApp> | null = null;
	private _auth: Promise<Auth> | null = null;
	private _firestore: Promise<Firestore> | null = null;

	/** `null` on the server. */
	async auth(): Promise<Auth | null> {
		if (!this._isBrowser) return null;
		this._auth ??= (async () => {
			const { getAuth } = await import('firebase/auth');
			return getAuth(await this._getApp());
		})();
		return this._auth;
	}

	/** `null` on the server. */
	async firestore(): Promise<Firestore | null> {
		if (!this._isBrowser) return null;
		this._firestore ??= (async () => {
			const { getFirestore } = await import('firebase/firestore');
			return getFirestore(await this._getApp());
		})();
		return this._firestore;
	}

	private _getApp() {
		this._app ??= import('firebase/app').then(({ initializeApp }) =>
			initializeApp(environment.firebase),
		);
		return this._app;
	}
}
