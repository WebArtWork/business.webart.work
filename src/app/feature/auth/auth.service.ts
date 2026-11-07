import { computed, inject, Service, signal } from '@angular/core';
import type { Auth, User } from 'firebase/auth';
import { AccountService } from '../account/account.service';
import { UserDataService } from '../account/user-data.service';
import { FirebaseService } from '../firebase/firebase.service';
import { PRACTICE_STORAGE_KEY } from '../practice/practice-score';
import { READING_STORAGE_KEY } from '../reading/reading.model';

/**
 * Firebase Auth. Everyone is signed in as a guest (an anonymous user) from the first visit, so progress is
 * saved from the start. Signing in with Google then turns the guest into that Google account.
 */
@Service()
export class AuthService {
	private readonly _firebase = inject(FirebaseService);
	private readonly _account = inject(AccountService);
	private readonly _data = inject(UserDataService);

	/**
	 * `undefined` until Firebase restores the session; `null` only when even a guest could not be signed in.
	 * The Firebase user is updated in place when a guest links Google, so every set counts as a change.
	 */
	readonly user = signal<User | null | undefined>(undefined, { equal: () => false });
	/** A guest: signed in, but not with Google yet. */
	readonly isGuest = computed(() => this.user()?.isAnonymous === true);

	private _ready: Promise<void> | null = null;

	/** Resolves with the current user once Firebase has checked the saved session, or created a guest. */
	async whenReady(): Promise<User | null> {
		this._ready ??= this._restore();
		await this._ready;
		return this.user() ?? null;
	}

	/**
	 * A guest links the Google account, keeping the same user and all its data. A Google account that is
	 * already in use (the user signed in before, maybe on another device) is signed in instead, and the
	 * guest's data is merged into it.
	 */
	async signInWithGoogle(): Promise<User> {
		const auth = await this._firebase.auth();
		if (!auth) throw new Error('Sign-in is only available in the browser.');

		const { GoogleAuthProvider, linkWithPopup, signInWithCredential, signInWithPopup } = await import('firebase/auth');
		const provider = new GoogleAuthProvider();
		const guest = auth.currentUser?.isAnonymous ? auth.currentUser : null;

		let user: User;
		try {
			user = guest ? (await linkWithPopup(guest, provider)).user : (await signInWithPopup(auth, provider)).user;
		} catch (error) {
			const credential = GoogleAuthProvider.credentialFromError(error as never);
			if (!guest || (error as { code?: string }).code !== 'auth/credential-already-in-use' || !credential) throw error;
			const guestScores = await this._data.loadScores(guest.uid);
			user = (await signInWithCredential(auth, credential)).user;
			await this._data.mergeScores(user.uid, guestScores);
		}

		this.user.set(user);
		await this._account.saveIdentity(user);
		return user;
	}

	/** Signs out; a new guest takes its place at once, empty. */
	async signOut(): Promise<void> {
		const auth = await this._firebase.auth();
		if (auth) {
			const { signOut } = await import('firebase/auth');
			await signOut(auth);
		}
	}

	/**
	 * Deletes the user and everything stored for them, then the progress kept on this device; a new guest follows.
	 * Firebase only deletes a user who signed in recently, so a Google user signs in again first; that also
	 * confirms it is really the owner.
	 */
	async deleteAccount(): Promise<void> {
		const auth = await this._firebase.auth();
		const user = auth?.currentUser;
		if (!user) throw new Error('Not signed in.');

		const { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth');
		if (!user.isAnonymous) await reauthenticateWithPopup(user, new GoogleAuthProvider());
		await this._account.deleteData(user.uid);
		await deleteUser(user);
		localStorage.removeItem(PRACTICE_STORAGE_KEY);
		localStorage.removeItem(READING_STORAGE_KEY);
	}

	private async _restore(): Promise<void> {
		const auth = await this._firebase.auth();
		if (!auth) {
			this.user.set(null);
			return;
		}

		const { onAuthStateChanged } = await import('firebase/auth');
		await new Promise<void>((resolve) => {
			onAuthStateChanged(auth, (user) => {
				if (user) {
					this.user.set(user);
					resolve();
				} else {
					// nobody yet, or just signed out: a guest takes over
					void this._signInAsGuest(auth).catch((error) => {
						console.error('Could not sign in as a guest.', error);
						this.user.set(null);
						resolve();
					});
				}
			});
		});
	}

	private async _signInAsGuest(auth: Auth) {
		const { signInAnonymously } = await import('firebase/auth');
		await signInAnonymously(auth);
	}
}

/**
 * The picture of the user. Linking Google to a guest leaves `photoURL` empty on the user, while the Google
 * profile (with the picture) sits in `providerData`, so look there too.
 */
export function userPhoto(user: User | null | undefined): string | null {
	return user?.photoURL || user?.providerData.find((info) => info.photoURL)?.photoURL || null;
}
