import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, Service, signal, untracked } from '@angular/core';
import type { User } from 'firebase/auth';
import { UserDataService } from '../account/user-data.service';
import { AuthService } from '../auth/auth.service';
import { PracticeProgressService } from '../practice/practice-progress.service';
import { READING_STORAGE_KEY } from './reading.model';

/**
 * The lessons the user has read, marked on the lesson page. A lesson with a practice result counts as read too.
 * Kept in this browser and, for the current user, in Firestore, like the practice results.
 */
@Service()
export class ReadingProgressService {
	private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
	private readonly _auth = inject(AuthService);
	private readonly _data = inject(UserDataService);
	private readonly _practice = inject(PracticeProgressService);
	private _uid: string | null = null;

	/** Slugs the user marked as read. */
	readonly marked = signal<string[]>(this._load());
	/** Slugs the user marked or practiced. */
	readonly read = computed(() => new Set([...this.marked(), ...Object.keys(this._practice.scores())]));

	constructor() {
		effect(() => {
			const user = this._auth.user();
			if (user) untracked(() => void this._adopt(user));
		});
	}

	isRead(slug: string): boolean {
		return this.read().has(slug);
	}

	toggle(slug: string) {
		const marked = this.marked();
		const next = marked.includes(slug) ? marked.filter((item) => item !== slug) : [...marked, slug];
		this._setLocal(next);
		if (this._uid) void this._data.saveReading(this._uid, next);
	}

	/** A user arrived; as with the practice results, a new guest starts empty and anything else adds up. */
	private async _adopt(user: User) {
		const previous = this._uid;
		this._uid = user.uid;
		if (previous === user.uid) return;
		if (previous && user.isAnonymous) this._setLocal([]);

		const remote = await this._data.loadReading(user.uid);
		const merged = [...new Set([...this.marked(), ...remote])];
		this._setLocal(merged);
		if (merged.length !== remote.length) await this._data.saveReading(user.uid, merged);
	}

	private _setLocal(slugs: string[]) {
		this.marked.set(slugs);
		if (!this._isBrowser) return;
		try {
			localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(slugs));
		} catch {
			// storage full or blocked: the marks last for this visit only
		}
	}

	private _load(): string[] {
		if (!this._isBrowser) return [];
		try {
			const raw = localStorage.getItem(READING_STORAGE_KEY);
			return raw ? (JSON.parse(raw) as string[]) : [];
		} catch {
			return [];
		}
	}
}
