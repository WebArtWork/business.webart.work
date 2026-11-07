import catalogData from '../../../data/theory/catalog.json';
import { TOPIC_LOADERS } from './theory.loaders';

/** A text in each language the lessons are written in. */
export interface Localized {
	en: string;
	ua: string;
}

export interface TheoryModule {
	slug: string;
	title: Localized;
	summary: Localized;
}

/** A lesson's card on the Learn page and its route, /theories/<slug>. */
export interface TheoryCard {
	number: number;
	slug: string;
	module: string;
	minutes: number;
	title: Localized;
	summary: Localized;
}

/** A lesson in one language: the short version, then the sections of the detailed one. */
export interface TheoryTopicBody {
	short: string;
	origin: string;
	core: string;
	components: string;
	apply: string;
	example: string;
	/** Questions a manager can check against; only some lessons have them. */
	checklist?: string;
	limitations: string;
}

/** A lesson's text in both languages; `related` holds the slugs of the lessons it links to. */
export interface TheoryTopic {
	slug: string;
	related: string[];
	en: TheoryTopicBody;
	ua: TheoryTopicBody;
}

export const THEORY_MODULES = catalogData.modules as TheoryModule[];
export const THEORY_TOPICS = catalogData.topics as TheoryCard[];

export const pick = (text: Localized, language: string | undefined): string =>
	language === 'ua' ? text.ua : text.en;

export async function loadTopic(slug: string): Promise<TheoryTopic> {
	return (await TOPIC_LOADERS[slug]()).default as TheoryTopic;
}
