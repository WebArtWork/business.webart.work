import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RichTextComponent } from '../../components/rich-text/rich-text.component';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';
import { PracticeProgressService } from '../../feature/practice/practice-progress.service';
import { hasPractice, TOTAL_POINTS } from '../../feature/practice/practice.data';
import { ReadingProgressService } from '../../feature/reading/reading-progress.service';
import {
	pick,
	THEORY_MODULES,
	THEORY_TOPICS,
	TheoryCard,
	TheoryTopic,
	TheoryTopicBody,
} from '../../feature/theory/theory.data';

/** The sections of the detailed version, in reading order. */
const SECTIONS: { key: Extract<keyof TheoryTopicBody, 'origin' | 'core' | 'components' | 'apply' | 'limitations'>; title: string }[] = [
	{ key: 'origin', title: 'Origin' },
	{ key: 'core', title: 'Core idea' },
	{ key: 'components', title: 'Key components' },
	{ key: 'apply', title: 'How to apply it' },
	{ key: 'limitations', title: 'Limitations' },
];

/**
 * One lesson, loaded by the route (`topic`) so the prerendered page already holds its text: the short
 * version (idea, worked example, common mistakes, self-check), then the detailed one behind **Read more**.
 * The detailed text stays in the page while hidden.
 */
@Component({
	imports: [RichTextComponent, RouterLink, TPipe],
	templateUrl: './theory-lesson.component.html',
})
export class TheoryLessonComponent {
	private readonly _route = inject(ActivatedRoute).snapshot;
	private readonly _language = inject(I18nService).language;
	private readonly _progress = inject(PracticeProgressService);
	private readonly _reading = inject(ReadingProgressService);

	protected readonly pick = pick;
	protected readonly language = this._language;
	protected readonly maxPoints = TOTAL_POINTS;

	protected readonly topic = this._route.data['topic'] as TheoryTopic;
	protected readonly index = THEORY_TOPICS.findIndex((card) => card.slug === this.topic.slug);
	protected readonly card = THEORY_TOPICS[this.index];
	protected readonly module = THEORY_MODULES.find((module) => module.slug === this.card.module)!;
	protected readonly previous = THEORY_TOPICS[this.index - 1];
	protected readonly next = THEORY_TOPICS[this.index + 1];
	protected readonly related = this.topic.related
		.map((slug) => THEORY_TOPICS.find((card) => card.slug === slug))
		.filter((card): card is TheoryCard => !!card);
	protected readonly practice = hasPractice(this.topic.slug);

	protected readonly body = computed(() => (this._language() === 'ua' ? this.topic.ua : this.topic.en));
	protected readonly sections = computed(() => {
		const body = this.body();
		return SECTIONS.map((section) => ({ ...section, text: body[section.key] }));
	});

	/** The detailed version is open; closed at first, so the short one reads on its own. */
	protected readonly expanded = signal(false);

	protected readonly isRead = computed(() => this._reading.isRead(this.topic.slug));
	protected readonly markedRead = computed(() => this._reading.marked().includes(this.topic.slug));
	protected readonly score = computed(() => this._progress.scores()[this.topic.slug]);

	protected toggleRead() {
		this._reading.toggle(this.topic.slug);
	}
}
