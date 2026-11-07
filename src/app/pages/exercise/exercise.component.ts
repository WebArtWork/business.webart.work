import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LinkedTextComponent } from '../../components/linked-text/linked-text.component';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { PracticeProgressService } from '../../feature/practice/practice-progress.service';
import {
	AnswerKey,
	isAuto,
	Language,
	loadKeys,
	PracticeSet,
	QUIZ_POINTS,
	Question,
	QuestionType,
	TOTAL_POINTS,
	TopicKeys,
	WRITTEN_POINTS,
	PRACTICE_TOPICS,
} from '../../feature/practice/practice.data';
import { pick, THEORY_MODULES } from '../../feature/theory/theory.data';

const TYPE_LABELS: Record<QuestionType, string> = {
	single_choice: 'Single choice',
	true_false: 'True or false',
	multiple_select: 'Select two',
	scenario_choice: 'Scenario',
	short_answer: 'Short answer',
	design_decision: 'Design decision',
	ai_code_review: 'AI code review',
};

const DIFFICULTY_LABELS = {
	foundation: 'Foundation',
	applied: 'Applied',
	advanced: 'Advanced',
	expert: 'Expert',
};

const TRUE_FALSE = [
	{ id: 'true', text: 'True' },
	{ id: 'false', text: 'False' },
];

/**
 * One lesson's exercises, loaded by the route (`set`): 10 questions checked on the page, then 5 written
 * tasks the reader compares with a sample answer and scores against the rubric. The answers load on demand.
 */
@Component({
	imports: [LinkedTextComponent, NgTemplateOutlet, RouterLink, TPipe],
	templateUrl: './exercise.component.html',
})
export class ExerciseComponent {
	private readonly _route = inject(ActivatedRoute).snapshot;
	private readonly _language = inject(I18nService).language;
	private readonly _progress = inject(PracticeProgressService);

	protected readonly set = this._route.data['set'] as PracticeSet;
	protected readonly index = PRACTICE_TOPICS.findIndex((card) => card.slug === this.set.slug);
	protected readonly card = PRACTICE_TOPICS[this.index];
	protected readonly module = THEORY_MODULES.find((module) => module.slug === this.card.module)!;
	protected readonly previous = PRACTICE_TOPICS[this.index - 1];
	protected readonly next = PRACTICE_TOPICS[this.index + 1];
	protected readonly pick = pick;
	protected readonly typeLabels = TYPE_LABELS;
	protected readonly difficultyLabels = DIFFICULTY_LABELS;
	protected readonly quizMax = QUIZ_POINTS;
	protected readonly writtenMax = WRITTEN_POINTS;
	protected readonly totalMax = TOTAL_POINTS;

	protected readonly language = this._language;
	private readonly _code = computed<Language>(() => (this._language() === 'ua' ? 'ua' : 'en'));
	protected readonly quiz = computed(() => this.set.questions[this._code()].filter(isAuto));
	protected readonly written = computed(() => this.set.questions[this._code()].filter((question) => !isAuto(question)));

	/** Picked option ids per question; true or false is 'true' or 'false'. */
	protected readonly answers = signal<Record<string, string[]>>({});
	protected readonly texts = signal<Record<string, string>>({});
	protected readonly checked = signal(false);
	protected readonly loadFailed = signal(false);
	private readonly _keys = signal<TopicKeys | null>(null);
	/** Written questions whose sample answer is open. */
	protected readonly revealed = signal<Record<string, boolean>>({});
	/** Rubric rows the reader ticked, per written question. */
	protected readonly awarded = signal<Record<string, number[]>>({});

	protected readonly answered = computed(() => this.quiz().filter((question) => this.answers()[question.id]?.length).length);

	protected readonly quizScore = computed(() =>
		this.checked() ? this.quiz().reduce((sum, question) => sum + (this.isCorrect(question) ? question.points : 0), 0) : 0,
	);

	protected readonly writtenScore = computed(() => {
		const awarded = this.awarded();
		return this.written().reduce(
			(sum, question) =>
				sum + (awarded[question.id] ?? []).reduce((part, row) => part + (this.key(question)?.rubric?.[row]?.points ?? 0), 0),
			0,
		);
	});

	constructor() {
		// the best result is saved once there is one to save
		effect(() => {
			const quiz = this.quizScore();
			const written = this.writtenScore();
			if (this.checked() || written > 0) this._progress.record(this.set.slug, { quiz, written });
		});
	}

	protected key(question: Question): AnswerKey | undefined {
		return this._keys()?.[this._code()][question.id];
	}

	protected options(question: Question) {
		return question.type === 'true_false' ? TRUE_FALSE : (question.options ?? []);
	}

	protected inputType(question: Question): 'radio' | 'checkbox' {
		return question.type === 'multiple_select' ? 'checkbox' : 'radio';
	}

	/** The ids that are right, once the answers are loaded. */
	private _correctIds(question: Question): string[] {
		const correct = this.key(question)?.correct;
		if (typeof correct === 'boolean') return [String(correct)];
		return correct ?? [];
	}

	protected isCorrect(question: Question): boolean {
		const picked = this.answers()[question.id] ?? [];
		const correct = this._correctIds(question);
		return picked.length === correct.length && correct.every((id) => picked.includes(id));
	}

	/** After checking: right options are marked, a wrong pick is marked too. */
	protected optionState(question: Question, id: string): 'correct' | 'wrong' | '' {
		if (!this.checked()) return '';
		if (this._correctIds(question).includes(id)) return 'correct';
		return this.answers()[question.id]?.includes(id) ? 'wrong' : '';
	}

	protected isPicked(question: Question, id: string): boolean {
		return !!this.answers()[question.id]?.includes(id);
	}

	/** A second pick is refused once two are chosen. */
	protected locked(question: Question, id: string): boolean {
		if (this.checked()) return true;
		return question.type === 'multiple_select' && (this.answers()[question.id]?.length ?? 0) >= 2 && !this.isPicked(question, id);
	}

	protected pickOption(question: Question, id: string) {
		const current = this.answers()[question.id] ?? [];
		const next =
			question.type === 'multiple_select' ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id];
		this.answers.update((answers) => ({ ...answers, [question.id]: next }));
	}

	protected setText(question: Question, value: string) {
		this.texts.update((texts) => ({ ...texts, [question.id]: value }));
	}

	protected async check() {
		if (!(await this._ensureKeys())) return;
		this.checked.set(true);
	}

	protected retry() {
		this.answers.set({});
		this.checked.set(false);
	}

	protected async toggleSample(question: Question) {
		if (!(await this._ensureKeys())) return;
		this.revealed.update((revealed) => ({ ...revealed, [question.id]: !revealed[question.id] }));
	}

	protected hasPoint(question: Question, row: number): boolean {
		return !!this.awarded()[question.id]?.includes(row);
	}

	protected togglePoint(question: Question, row: number) {
		this.awarded.update((awarded) => {
			const current = awarded[question.id] ?? [];
			return { ...awarded, [question.id]: current.includes(row) ? current.filter((item) => item !== row) : [...current, row] };
		});
	}

	protected earned(question: Question): number {
		return (this.awarded()[question.id] ?? []).reduce((sum, row) => sum + (this.key(question)?.rubric?.[row]?.points ?? 0), 0);
	}

	private async _ensureKeys(): Promise<boolean> {
		if (this._keys()) return true;
		try {
			this._keys.set(await loadKeys(this.set.slug));
			this.loadFailed.set(false);
			return true;
		} catch {
			this.loadFailed.set(true);
			return false;
		}
	}
}
