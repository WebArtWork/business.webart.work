import { TOTAL_POINTS } from '../practice/practice.data';
import { PracticeScores, scoreTotal } from '../practice/practice-score';

/** Where every learner starts, before any lesson is practiced. */
export const BUSINESS_BASE_RATING = 800;
/** Rating a perfect lesson result adds; all 103 lessons at full marks come to about 2600. */
export const RATING_PER_LESSON = 17.5;
/** A lesson that was read but not practiced still counts a little. */
export const RATING_PER_READ = 2;

export interface BusinessRank {
	name: string;
	/** Rating needed to reach it. */
	from: number;
}

/** The business ladder, from the first lesson to running your own company. */
export const BUSINESS_RANKS: BusinessRank[] = [
	{ name: 'Founder', from: 0 },
	{ name: 'Seller', from: 1000 },
	{ name: 'Manager', from: 1400 },
	{ name: 'Director', from: 1800 },
	{ name: 'Strategist', from: 2200 },
	{ name: 'Entrepreneur', from: 2500 },
];

export interface BusinessRating {
	rating: number;
	rank: BusinessRank;
	next: BusinessRank | null;
	/** Share of the way from this rank to the next, 0 to 1; 1 at the top. */
	share: number;
}

/**
 * The Business Elo: every practiced lesson adds the share of its points the reader earned, so it only grows
 * as results improve, and it is the same on every device because it is computed from the saved results.
 */
export function businessRating(scores: PracticeScores, readOnly: number): BusinessRating {
	let rating = BUSINESS_BASE_RATING + readOnly * RATING_PER_READ;
	for (const score of Object.values(scores)) {
		rating += Math.min(1, scoreTotal(score) / TOTAL_POINTS) * RATING_PER_LESSON;
	}
	rating = Math.round(rating);
	let index = 0;
	while (BUSINESS_RANKS[index + 1] && rating >= BUSINESS_RANKS[index + 1].from) index++;
	const rank = BUSINESS_RANKS[index];
	const next = BUSINESS_RANKS[index + 1] ?? null;
	return { rating, rank, next, share: next ? (rating - rank.from) / (next.from - rank.from) : 1 };
}
