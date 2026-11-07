import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID, Service, signal, untracked } from '@angular/core';
import type { User } from 'firebase/auth';
import { UserDataService } from '../account/user-data.service';
import { AuthService } from '../auth/auth.service';
import { mergeScores, PRACTICE_STORAGE_KEY, PracticeScore, PracticeScores, sameScores, scoreTotal } from './practice-score';

export type { PracticeScore } from './practice-score';

/**
 * The best result per lesson. It is kept in this browser and, for the current user (a guest or a Google
 * account), in Firestore, so it follows the user to another device and into a Google account.
 */
@Service()
export class PracticeProgressService {
	private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
	private readonly _auth = inject(AuthService);
	private readonly _data = inject(UserDataService);
	private _current: { uid: string } | null = null;

	readonly scores = signal<PracticeScores>(this._load());

	constructor() {
		effect(() => {
			const user = this._auth.user();
			if (user) untracked(() => void this._adopt(user));
		});
	}

	get(slug: string): PracticeScore | undefined {
		return this.scores()[slug];
	}

	/** Keeps the result when it beats the saved one. */
	record(slug: string, score: PracticeScore) {
		const best = this.get(slug);
		if (best && scoreTotal(best) >= scoreTotal(score)) return;
		const next = { ...this.scores(), [slug]: score };
		this._setLocal(next);
		if (this._current) void this._data.saveScores(this._current.uid, next);
	}

	/**
	 * A user arrived: the first one of a visit, or another one after signing in or out.
	 * A guest account that replaces another user starts empty; everything else adds up, so a guest's
	 * results move into the Google account they sign in with.
	 */
	private async _adopt(user: User) {
		const previous = this._current;
		this._current = { uid: user.uid };
		if (previous?.uid === user.uid) return;
		if (previous && user.isAnonymous) this._setLocal({});

		const remote = await this._data.loadScores(user.uid);
		const merged = mergeScores(this.scores(), remote);
		this._setLocal(merged);
		if (!sameScores(merged, remote)) await this._data.saveScores(user.uid, merged);
	}

	private _setLocal(scores: PracticeScores) {
		this.scores.set(scores);
		if (!this._isBrowser) return;
		try {
			localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(scores));
		} catch {
			// storage full or blocked: the result lasts for this visit only
		}
	}

	private _load(): PracticeScores {
		if (!this._isBrowser) return {};
		try {
			const raw = localStorage.getItem(PRACTICE_STORAGE_KEY);
			return raw ? (JSON.parse(raw) as PracticeScores) : {};
		} catch {
			return {};
		}
	}
}
