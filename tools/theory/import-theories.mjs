// Turns the theory sources in content/theories/NN.md (format: theory-source.mjs) into the app data:
//   src/data/theory/catalog.json, src/data/theory/topics/<slug>.json and
//   src/app/feature/theory/theory.loaders.ts, plus the SEO entries in src/data/company/company.json.
// Run: npm run theories:import
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apostrophes, parse, relatedOf, words } from './theory-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = path.join(root, 'content/theories');
const DATA = path.join(root, 'src/data/theory');

/** The modules, in order; a lesson belongs to the last module whose `from` is at or below its number. */
const MODULES = [
	{
		from: 1,
		slug: '01-strategy-competition',
		title: { en: 'Strategy & Competition', ua: 'Стратегія та конкуренція' },
		summary: {
			en: 'Understand industries, competitors and where a company can win.',
			ua: 'Розберіться в галузях, конкурентах і в тому, де компанія може виграти.',
		},
	},
	{
		from: 16,
		slug: '02-innovation-startups',
		title: { en: 'Innovation & Startups', ua: 'Інновації та стартапи' },
		summary: {
			en: 'Find a real problem, test ideas cheaply and reach product-market fit.',
			ua: 'Знайдіть справжню проблему, дешево перевіряйте ідеї й досягайте відповідності продукту ринку.',
		},
	},
	{
		from: 30,
		slug: '03-platforms-scale',
		title: { en: 'Platforms, Networks & Scale', ua: 'Платформи, мережі та масштаб' },
		summary: {
			en: 'See why some businesses grow stronger as they get bigger.',
			ua: 'Зрозумійте, чому деякі бізнеси стають сильнішими зі зростанням.',
		},
	},
	{
		from: 40,
		slug: '04-marketing-customers',
		title: { en: 'Marketing & Customers', ua: 'Маркетинг і клієнти' },
		summary: {
			en: 'Choose customers, position the offer, set prices and keep customers coming back.',
			ua: 'Обирайте клієнтів, позиціонуйте пропозицію, встановлюйте ціни й утримуйте клієнтів.',
		},
	},
	{
		from: 55,
		slug: '05-economics-finance',
		title: { en: 'Economics & Finance', ua: 'Економіка та фінанси' },
		summary: {
			en: 'Read the numbers behind every decision: costs, margins, cash and returns.',
			ua: 'Розумійте цифри за кожним рішенням: витрати, маржу, гроші й віддачу.',
		},
	},
	{
		from: 69,
		slug: '06-operations-execution',
		title: { en: 'Operations & Execution', ua: 'Операції та виконання' },
		summary: {
			en: 'Turn plans into results with focus, measurement and continuous improvement.',
			ua: 'Перетворюйте плани на результати завдяки фокусу, вимірюванню й постійному вдосконаленню.',
		},
	},
	{
		from: 78,
		slug: '07-organization-leadership',
		title: { en: 'Organization & Leadership', ua: 'Організація та лідерство' },
		summary: {
			en: 'Motivate people, build teams and lead change.',
			ua: 'Мотивуйте людей, будуйте команди й ведіть зміни.',
		},
	},
	{
		from: 89,
		slug: '08-behavioral-decisions',
		title: { en: 'Behavioral & Decision Making', ua: 'Поведінка та ухвалення рішень' },
		summary: {
			en: 'Spot the biases in judgement and make clearer decisions.',
			ua: 'Помічайте упередження в судженнях і ухвалюйте чіткіші рішення.',
		},
	},
];

const firstSentence = (text) => text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;

/** Longest summary a lesson card and a search result show in full. */
const SUMMARY_LIMIT = 160;

/**
 * The first sentence of the short version, kept to SUMMARY_LIMIT: a longer one ends at its colon when
 * the part before it can stand alone, else at the last whole word, with an ellipsis.
 */
function summaryOf(short) {
	const sentence = firstSentence(short.replace(/\*\*/g, ''));
	if (sentence.length <= SUMMARY_LIMIT) return sentence;
	const colon = sentence.indexOf(': ');
	if (colon >= 40 && colon < SUMMARY_LIMIT) return sentence.slice(0, colon) + '.';
	const cut = sentence.slice(0, SUMMARY_LIMIT - 1);
	return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

/** From the English title without its brackets: "Resource-Based View (RBV)" is resource-based-view. */
const slugOf = (title) =>
	apostrophes(title.replace(/\s*\(.*?\)/g, '') || title)
		.toLowerCase()
		.replace(/'/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const files = (await readdir(SOURCE)).filter((name) => /^\d+\.md$/.test(name)).sort();
const lessons = [];
for (const file of files) lessons.push(parse(await readFile(path.join(SOURCE, file), 'utf8'), file));
lessons.sort((a, b) => a.number - b.number);
const numbers = lessons.map((lesson) => lesson.number);
if (new Set(numbers).size !== numbers.length) throw new Error('Two sources share a lesson number');

for (const lesson of lessons) {
	lesson.slug = slugOf(lesson.title.en);
	lesson.module = MODULES.findLast((module) => module.from <= lesson.number).slug;
	lesson.related = relatedOf(lesson, lessons);
	if (lesson.related.length < 1) console.warn(`${lesson.number}: no related lesson found in "${lesson.en.related}"`);
}
const slugOfNumber = new Map(lessons.map((lesson) => [lesson.number, lesson.slug]));

await rm(path.join(DATA, 'topics'), { recursive: true, force: true });
await mkdir(path.join(DATA, 'topics'), { recursive: true });
const strip = ({ related, ...body }) => body;
for (const lesson of lessons) {
	const topic = {
		slug: lesson.slug,
		related: lesson.related.map((number) => slugOfNumber.get(number)),
		en: strip(lesson.en),
		ua: strip(lesson.ua),
	};
	await writeFile(path.join(DATA, 'topics', `${lesson.slug}.json`), JSON.stringify(topic, null, '\t') + '\n');
}

/** Every word of a lesson body, for its reading time. */
const textOf = ({ related, mistakes, selfCheck, ...rest }) =>
	[...Object.values(rest), ...mistakes, ...selfCheck.flatMap(({ question, answer }) => [question, answer])].join(' ');
const catalog = {
	modules: MODULES.map(({ from, ...module }) => module),
	topics: lessons.map((lesson) => ({
		number: lesson.number,
		slug: lesson.slug,
		module: lesson.module,
		minutes: Math.max(1, Math.round(words(textOf(lesson.en)) / 200)),
		title: lesson.title,
		summary: { en: summaryOf(lesson.en.short), ua: summaryOf(lesson.ua.short) },
	})),
};
await writeFile(path.join(DATA, 'catalog.json'), JSON.stringify(catalog, null, '\t') + '\n');

const loaders = lessons
	.map((lesson) => `\t'${lesson.slug}': () => import('../../../data/theory/topics/${lesson.slug}.json'),`)
	.join('\n');
await writeFile(
	path.join(root, 'src/app/feature/theory/theory.loaders.ts'),
	`// Generated by tools/theory/import-theories.mjs from content/theories: one lazy chunk per lesson.\nexport const TOPIC_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n${loaders}\n};\n`,
);

// one SEO entry per lesson page; the other pages keep theirs
const companyFile = path.join(root, 'src/data/company/company.json');
const company = JSON.parse(await readFile(companyFile, 'utf8'));
const pageSeo = Object.fromEntries(Object.entries(company.pageSeo).filter(([route]) => !route.startsWith('/theories/')));
for (const lesson of lessons)
	pageSeo[`/theories/${lesson.slug}`] = { title: lesson.title.en, description: summaryOf(lesson.en.short), image: '/seo/theory.jpg' };
company.pageSeo = pageSeo;
await writeFile(companyFile, JSON.stringify(company, null, '\t') + '\n');

console.log(`Imported ${lessons.length} lessons in ${new Set(lessons.map((lesson) => lesson.module)).size} modules.`);
