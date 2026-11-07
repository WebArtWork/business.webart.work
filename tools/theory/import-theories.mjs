// Turns the theory sources in content/theories/NN.md into the app data:
//   src/data/theory/catalog.json, src/data/theory/topics/<slug>.json and
//   src/app/feature/theory/theory.loaders.ts, plus the SEO entries in src/data/company/company.json.
// Run: npm run theories:import
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
		from: 51,
		slug: '05-economics-finance',
		title: { en: 'Economics & Finance', ua: 'Економіка та фінанси' },
		summary: {
			en: 'Read the numbers behind every decision: costs, margins, cash and returns.',
			ua: 'Розумійте цифри за кожним рішенням: витрати, маржу, гроші й віддачу.',
		},
	},
	{
		from: 63,
		slug: '06-operations-execution',
		title: { en: 'Operations & Execution', ua: 'Операції та виконання' },
		summary: {
			en: 'Turn plans into results with focus, measurement and continuous improvement.',
			ua: 'Перетворюйте плани на результати завдяки фокусу, вимірюванню й постійному вдосконаленню.',
		},
	},
	{
		from: 72,
		slug: '07-organization-leadership',
		title: { en: 'Organization & Leadership', ua: 'Організація та лідерство' },
		summary: {
			en: 'Motivate people, build teams and lead change.',
			ua: 'Мотивуйте людей, будуйте команди й ведіть зміни.',
		},
	},
	{
		from: 82,
		slug: '08-behavioral-decisions',
		title: { en: 'Behavioral & Decision Making', ua: 'Поведінка та ухвалення рішень' },
		summary: {
			en: 'Spot the biases in judgement and make clearer decisions.',
			ua: 'Помічайте упередження в судженнях і ухвалюйте чіткіші рішення.',
		},
	},
];

const FIELDS = ['origin', 'core', 'components', 'apply', 'example', 'limitations', 'related'];
const LABELS = {
	en: ['Origin', 'Core idea', 'Key components', 'How to apply it', 'Example', 'Limitations', 'Related theories'],
	ua: ['Походження', 'Основна ідея', 'Ключові елементи', 'Як застосувати', 'Приклад', 'Обмеження', "Пов'язані теорії"],
};
/** Optional notes for managers; some sources add them as a bullet, some as a paragraph after the list. */
const CHECKLIST = {
	en: ['Manager checklist', 'Practical check'],
	ua: ['Контрольні запитання для керівника', 'Практична перевірка'],
};
const SECTIONS = ['EN — Short', 'EN — Detailed', 'UA — Коротко', 'UA — Детально'];

const apostrophes = (text) => text.replace(/[’ʼ]/g, "'");
const squash = (text) => text.replace(/\s+/g, ' ').trim();
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const firstSentence = (text) => text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;

/** From the English title without its brackets: "Resource-Based View (RBV)" is resource-based-view. */
const slugOf = (title) =>
	apostrophes(title.replace(/\s*\(.*?\)/g, '') || title)
		.toLowerCase()
		.replace(/'/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** Lower case, no punctuation, single spaces: what titles are compared by. */
const key = (text) =>
	apostrophes(text)
		.toLowerCase()
		.replace(/[–—-]/g, ' ')
		.replace(/[^a-zа-яіїєґ0-9' ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

function parseDetailed(text, language, file) {
	const items = [];
	const extra = [];
	for (const line of text.split('\n')) {
		const bullet = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
		const paragraph = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
		if (bullet) items.push({ label: bullet[1], text: bullet[2] });
		else if (paragraph) extra.push({ label: paragraph[1], text: paragraph[2] });
		else if (line.trim()) (extra.at(-1) ?? items.at(-1)).text += ' ' + line.trim();
	}
	const isChecklist = (item) => CHECKLIST[language].some((label) => apostrophes(label) === apostrophes(item.label));
	const checklist = [...items, ...extra].filter(isChecklist).map((item) => squash(item.text));
	const fields = items.filter((item) => !isChecklist(item));
	const unknown = extra.filter((item) => !isChecklist(item));
	if (unknown.length) throw new Error(`${file}: unexpected paragraph "${unknown[0].label}"`);
	const labels = fields.map((item) => apostrophes(item.label));
	if (labels.join('|') !== LABELS[language].map(apostrophes).join('|'))
		throw new Error(`${file} ${language}: labels are ${labels.join(', ')}`);
	const body = Object.fromEntries(FIELDS.map((field, index) => [field, squash(fields[index].text)]));
	if (checklist.length) body.checklist = checklist.join(' ');
	return body;
}

const CYRILLIC = /[а-яіїєґ]/i;
const balanced = (text) => (text.match(/\(/g) ?? []).length === (text.match(/\)/g) ?? []).length;

/**
 * "English / Ukrainian", where either title may hold a " / " of its own ("Two-Sided / Multi-Sided Markets",
 * "Marketing Mix (4Ps / 7Ps)"): the split leaves no Cyrillic on the left, closed brackets on both sides,
 * and preferably a Cyrillic letter right after it.
 */
function splitTitle(heading) {
	const splits = [...heading.matchAll(/\s+\/\s+/g)]
		.map((match) => ({ en: heading.slice(0, match.index).trim(), ua: heading.slice(match.index + match[0].length).trim() }))
		.filter(({ en, ua }) => !CYRILLIC.test(en) && CYRILLIC.test(ua) && balanced(en) && balanced(ua));
	return splits.find(({ ua }) => CYRILLIC.test(ua[0]) || ua[0] === '«') ?? splits.at(-1) ?? null;
}

function parse(source, file) {
	// a group heading ("## Innovation & Startups") can trail the last lesson of a group
	const text = source.replace(/\r/g, '').replace(/\n## (?!\d+\.)[^\n]*\s*$/, '').trim();
	const head = text.match(/^##\s*(\d+)\.\s*(.+?)\s*$/m);
	const title = head && splitTitle(head[2]);
	if (!title) throw new Error(`${file}: no "## N. English / Ukrainian" heading`);
	const parts = text.split(/\n###\s*/).slice(1);
	const names = parts.map((part) => part.split('\n', 1)[0].trim());
	if (names.join('|') !== SECTIONS.join('|')) throw new Error(`${file}: sections are ${names.join(', ')}`);
	const body = parts.map((part) => part.slice(part.indexOf('\n') + 1).trim());
	const en = parseDetailed(body[1], 'en', file);
	const ua = parseDetailed(body[3], 'ua', file);
	return {
		number: Number(head[1]),
		title,
		en: { short: squash(body[0]), ...en },
		ua: { short: squash(body[2]), ...ua },
	};
}

/** The lessons named in an English "Related theories" text: by "#N" or "N." when given, else by title. */
function relatedOf(lesson, lessons) {
	const text = lesson.en.related;
	const found = new Set();
	for (const match of text.matchAll(/(?:#|№)(\d+)|(?:^|;\s*|,\s*)(\d+)\.\s/g)) found.add(Number(match[1] ?? match[2]));
	if (!found.size) {
		const haystack = ` ${key(text)} `;
		const names = lessons.flatMap((other) => {
			const full = other.title.en;
			const bare = full.replace(/\s*\(.*?\)\s*/g, ' ');
			return [full, bare].map((name) => ({ number: other.number, name: key(name) }));
		});
		names.sort((a, b) => b.name.length - a.name.length);
		let rest = haystack;
		for (const { number, name } of names) {
			if (name.length > 3 && rest.includes(` ${name} `)) {
				found.add(number);
				rest = rest.replaceAll(` ${name} `, ' | ');
			}
		}
	}
	found.delete(lesson.number);
	return [...found].filter((number) => lessons.some((other) => other.number === number));
}

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

const plain = (text) => text.replace(/\*\*/g, '');
const catalog = {
	modules: MODULES.map(({ from, ...module }) => module),
	topics: lessons.map((lesson) => ({
		number: lesson.number,
		slug: lesson.slug,
		module: lesson.module,
		minutes: Math.max(1, Math.round(words(Object.values(strip(lesson.en)).join(' ')) / 200)),
		title: lesson.title,
		summary: { en: plain(firstSentence(lesson.en.short)), ua: plain(firstSentence(lesson.ua.short)) },
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
	pageSeo[`/theories/${lesson.slug}`] = { title: lesson.title.en, description: plain(lesson.en.short), image: '/seo/theory.jpg' };
company.pageSeo = pageSeo;
await writeFile(companyFile, JSON.stringify(company, null, '\t') + '\n');

console.log(`Imported ${lessons.length} lessons in ${new Set(lessons.map((lesson) => lesson.module)).size} modules.`);
