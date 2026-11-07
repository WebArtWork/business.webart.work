import { THEORY_TOPICS, TheoryCard } from '../theory/theory.data';

interface PathLevel {
	name: string;
	/** Modules of the level, in the order the learning path studies them. */
	modules: string[];
}

/** The recommended learning path of the knowledge base: what to study first. */
export const LEARNING_PATH: PathLevel[] = [
	{ name: 'Foundations', modules: ['05-economics-finance', '08-behavioral-decisions'] },
	{ name: 'Starting up', modules: ['02-innovation-startups', '04-marketing-customers'] },
	{ name: 'Running a company', modules: ['06-operations-execution', '07-organization-leadership'] },
	{ name: 'Strategy', modules: ['01-strategy-competition', '03-platforms-scale'] },
];

const _place = (card: TheoryCard): [number, number] => {
	for (const [level, item] of LEARNING_PATH.entries()) {
		const index = item.modules.indexOf(card.module);
		if (index >= 0) return [level, index];
	}
	return [LEARNING_PATH.length, 0];
};

/** The lessons by importance: the learning path's levels and modules in order, then the order of the lessons. */
export const BY_PRIORITY: TheoryCard[] = [...THEORY_TOPICS].sort((a, b) => {
	const [levelA, moduleA] = _place(a);
	const [levelB, moduleB] = _place(b);
	return levelA - levelB || moduleA - moduleB || a.number - b.number;
});

/** The level of the learning path a lesson belongs to. */
export const levelOf = (card: TheoryCard): string => LEARNING_PATH[_place(card)[0]]?.name ?? '';
