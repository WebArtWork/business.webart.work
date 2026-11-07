export interface PracticeScore {
	quiz: number;
	written: number;
}

export type PracticeScores = Record<string, PracticeScore>;

/** Where the scores are kept in this browser. */
export const PRACTICE_STORAGE_KEY = 'business_practice';

export const scoreTotal = (score: PracticeScore): number => score.quiz + score.written;

/** The better result per lesson, so merging two accounts never loses a result. */
export function mergeScores(a: PracticeScores, b: PracticeScores): PracticeScores {
	const merged: PracticeScores = { ...a };
	for (const [slug, score] of Object.entries(b)) {
		const current = merged[slug];
		if (!current || scoreTotal(score) > scoreTotal(current)) merged[slug] = score;
	}
	return merged;
}

export function sameScores(a: PracticeScores, b: PracticeScores): boolean {
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((slug) => b[slug] && a[slug].quiz === b[slug].quiz && a[slug].written === b[slug].written)
	);
}
