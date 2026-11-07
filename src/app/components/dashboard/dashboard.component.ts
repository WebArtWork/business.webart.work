import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BY_PRIORITY, levelOf } from '../../feature/dashboard/priority';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { PracticeProgressService } from '../../feature/practice/practice-progress.service';
import { scoreTotal } from '../../feature/practice/practice-score';
import { hasPractice, PRACTICE_TOPICS, TOTAL_POINTS } from '../../feature/practice/practice.data';
import { ReadingProgressService } from '../../feature/reading/reading-progress.service';
import { pick, THEORY_TOPICS } from '../../feature/theory/theory.data';

/** Results under this many points are suggested again. */
const RETRY_BELOW = 26;
const SHOWN = 4;

/**
 * The home page of someone who is signed in: what to read next by importance, and which exercises to do for
 * the lessons already read.
 */
@Component({
	selector: 'app-dashboard',
	imports: [RouterLink, TPipe],
	templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
	private readonly _reading = inject(ReadingProgressService);
	private readonly _practice = inject(PracticeProgressService);
	private readonly _language = inject(I18nService).language;

	protected readonly pick = pick;
	protected readonly language = this._language;
	protected readonly lessons = THEORY_TOPICS.length;
	protected readonly practiceSets = PRACTICE_TOPICS.length;
	protected readonly maxPoints = TOTAL_POINTS;

	protected readonly readCount = computed(() => this._reading.read().size);
	protected readonly practicedCount = computed(() => Object.keys(this._practice.scores()).length);
	protected readonly points = computed(() => Object.values(this._practice.scores()).reduce((sum, score) => sum + scoreTotal(score), 0));

	/** The lessons not read yet, the most important first. */
	protected readonly readNext = computed(() =>
		BY_PRIORITY.filter((card) => !this._reading.isRead(card.slug))
			.slice(0, SHOWN)
			.map((card) => ({ ...card, level: levelOf(card) })),
	);

	/** Exercises of lessons that were read and not practiced yet, then those practiced with a low result. */
	protected readonly practiceNext = computed(() => {
		const scores = this._practice.scores();
		const fresh = BY_PRIORITY.filter((card) => hasPractice(card.slug) && this._reading.isRead(card.slug) && !scores[card.slug]).map((card) => ({ ...card, best: null as number | null }));
		const retry = BY_PRIORITY.filter((card) => scores[card.slug] && scoreTotal(scores[card.slug]) < RETRY_BELOW).map((card) => ({
			...card,
			best: scoreTotal(scores[card.slug]),
		}));
		return [...fresh, ...retry].slice(0, SHOWN);
	});

}
