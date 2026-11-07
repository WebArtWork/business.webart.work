import { computed, inject, Service } from '@angular/core';
import { PracticeProgressService } from '../practice/practice-progress.service';
import { ReadingProgressService } from '../reading/reading-progress.service';
import { businessRating } from './business-rating';

/** The learner's Elo and rank, computed from the saved practice results and read lessons. */
@Service()
export class BusinessRatingService {
	private readonly _practice = inject(PracticeProgressService);
	private readonly _reading = inject(ReadingProgressService);

	readonly rating = computed(() => {
		const scores = this._practice.scores();
		const readOnly = [...this._reading.read()].filter((slug) => !scores[slug]).length;
		return businessRating(scores, readOnly);
	});
}
