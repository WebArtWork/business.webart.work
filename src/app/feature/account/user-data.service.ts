import { inject, Service } from '@angular/core';
import { PracticeScores, mergeScores } from '../practice/practice-score';
import { FirebaseService } from '../firebase/firebase.service';

/** What is kept for a user in Firestore: `users/{uid}/progress/practice`. Rules: firestore.rules. */
@Service()
export class UserDataService {
	private readonly _firebase = inject(FirebaseService);

	/** Empty when there is nothing saved, or when it cannot be read (offline, server). */
	async loadScores(uid: string): Promise<PracticeScores> {
		try {
			const db = await this._firebase.firestore();
			if (!db) return {};
			const { doc, getDoc } = await import('firebase/firestore');
			const snapshot = await getDoc(doc(db, 'users', uid, 'progress', 'practice'));
			return (snapshot.data()?.['scores'] as PracticeScores | undefined) ?? {};
		} catch (error) {
			console.error('Could not load the saved results.', error);
			return {};
		}
	}

	async saveScores(uid: string, scores: PracticeScores): Promise<void> {
		try {
			const db = await this._firebase.firestore();
			if (!db) return;
			const { doc, serverTimestamp, setDoc } = await import('firebase/firestore');
			await setDoc(doc(db, 'users', uid, 'progress', 'practice'), { scores, updatedAt: serverTimestamp() });
		} catch (error) {
			console.error('Could not save the results.', error);
		}
	}

	/** Adds results to what the user already has, keeping the better one of each lesson. */
	async mergeScores(uid: string, scores: PracticeScores): Promise<void> {
		if (!Object.keys(scores).length) return;
		await this.saveScores(uid, mergeScores(await this.loadScores(uid), scores));
	}

	/** The lessons marked as read: `users/{uid}/progress/reading`. */
	async loadReading(uid: string): Promise<string[]> {
		try {
			const db = await this._firebase.firestore();
			if (!db) return [];
			const { doc, getDoc } = await import('firebase/firestore');
			const snapshot = await getDoc(doc(db, 'users', uid, 'progress', 'reading'));
			return (snapshot.data()?.['read'] as string[] | undefined) ?? [];
		} catch (error) {
			console.error('Could not load the lessons read.', error);
			return [];
		}
	}

	async saveReading(uid: string, read: string[]): Promise<void> {
		try {
			const db = await this._firebase.firestore();
			if (!db) return;
			const { doc, serverTimestamp, setDoc } = await import('firebase/firestore');
			await setDoc(doc(db, 'users', uid, 'progress', 'reading'), { read, updatedAt: serverTimestamp() });
		} catch (error) {
			console.error('Could not save the lessons read.', error);
		}
	}

}
