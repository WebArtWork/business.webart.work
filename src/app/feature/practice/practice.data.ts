import { THEORY_TOPICS } from '../theory/theory.data';
import { KEY_LOADERS, QUESTION_LOADERS } from './practice.loaders';

/** A piece of text, bold or not. The exercise pack's markdown is turned into these when the data is generated. */
export interface Run {
	t: string;
	b?: true;
}

export type Block = { k: 'p' | 'quote'; runs: Run[] } | { k: 'ul'; items: Run[][] };

export type QuestionType =
	| 'single_choice'
	| 'true_false'
	| 'multiple_select'
	| 'scenario_choice'
	| 'short_answer'
	| 'design_decision'
	| 'ai_code_review';

export type Language = 'en' | 'ua';

export interface Question {
	id: string;
	type: QuestionType;
	difficulty: 'foundation' | 'applied' | 'advanced' | 'expert';
	points: number;
	prompt: Block[];
	options?: { id: string; text: string }[];
}

/** The 15 questions of one lesson, per language; the answers are kept apart (`TopicKeys`). */
export interface PracticeSet {
	slug: string;
	topicId: number;
	questions: Record<Language, Question[]>;
}

export interface AnswerKey {
	/** Option ids for choice questions, a boolean for true or false. */
	correct?: string[] | boolean;
	explanation?: Block[];
	/** Written questions: a direction for a good answer, and what each point is awarded for. */
	sample?: Block[];
	rubric?: { criterion: string; points: number }[];
}

export type TopicKeys = Record<Language, Record<string, AnswerKey>>;

/** Questions that are graded on the page; the rest are written and self-assessed against the rubric. */
export const AUTO_TYPES: QuestionType[] = ['single_choice', 'true_false', 'multiple_select', 'scenario_choice'];
export const isAuto = (question: Question): boolean => AUTO_TYPES.includes(question.type);

export const QUIZ_POINTS = 13;
export const WRITTEN_POINTS = 24;
export const TOTAL_POINTS = QUIZ_POINTS + WRITTEN_POINTS;

/** A lesson's exercises have the lesson's slug; only lessons whose practice set is written have one. */
export const hasPractice = (slug: string): boolean => slug in QUESTION_LOADERS;
export const PRACTICE_TOPICS = THEORY_TOPICS.filter((topic) => hasPractice(topic.slug));

export async function loadQuestions(slug: string): Promise<PracticeSet> {
	return (await QUESTION_LOADERS[slug]()).default as PracticeSet;
}

/** Loaded when the answers are checked, so the prerendered page does not carry them. */
export async function loadKeys(slug: string): Promise<TopicKeys> {
	return (await KEY_LOADERS[slug]()).default as TopicKeys;
}
