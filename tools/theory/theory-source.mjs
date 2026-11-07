// Reads one theory source, content/theories/NN.md, into a lesson. Shared by import-theories.mjs and
// lint-theories.mjs. The format, in this order:
//
//   ## 12. English title / Український заголовок
//   ### EN: Short             two or three sentences: the idea
//   ### EN: Example           a worked example with real numbers
//   ### EN: Common mistakes   one "- " bullet per mistake
//   ### EN: Self-check        "1. **Question?** Answer." per line
//   ### EN: Detailed          "- **Label:** text" for Origin, Core idea, Key components, How to apply it,
//                             Limitations, Related theories
//   ### UA: Коротко / UA: Приклад / UA: Типові помилки / UA: Самоперевірка / UA: Детально, the same in Ukrainian

export const SECTIONS = {
	en: ['Short', 'Example', 'Common mistakes', 'Self-check', 'Detailed'],
	ua: ['Коротко', 'Приклад', 'Типові помилки', 'Самоперевірка', 'Детально'],
};

/** The fields of the detailed version, and the label each has in the source. */
export const FIELDS = ['origin', 'core', 'components', 'apply', 'limitations', 'related'];
const LABELS = {
	en: ['Origin', 'Core idea', 'Key components', 'How to apply it', 'Limitations', 'Related theories'],
	ua: ['Походження', 'Основна ідея', 'Ключові елементи', 'Як застосувати', 'Обмеження', "Пов'язані теорії"],
};

export const apostrophes = (text) => text.replace(/[’ʼ]/g, "'");
export const squash = (text) => text.replace(/\s+/g, ' ').trim();
export const words = (text) => text.split(/\s+/).filter(Boolean).length;

/** Lower case, no punctuation, single spaces: what titles are compared by. */
export const key = (text) =>
	apostrophes(text)
		.toLowerCase()
		.replace(/[–-]/g, ' ')
		.replace(/[^a-zа-яіїєґ0-9' ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

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

function parseDetailed(text, language, file) {
	const items = [];
	for (const line of text.split('\n')) {
		const bullet = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
		if (bullet) items.push({ label: bullet[1], text: bullet[2] });
		else if (line.trim() && items.length) items.at(-1).text += ' ' + line.trim();
		else if (line.trim()) throw new Error(`${file} ${language}: text before the first detailed field`);
	}
	const labels = items.map((item) => apostrophes(item.label));
	if (labels.join('|') !== LABELS[language].map(apostrophes).join('|'))
		throw new Error(`${file} ${language}: detailed labels are ${labels.join(', ')}`);
	return Object.fromEntries(FIELDS.map((field, index) => [field, squash(items[index].text)]));
}

function parseList(text, language, file) {
	const lines = text.split('\n').filter((line) => line.trim());
	const bad = lines.find((line) => !line.startsWith('- '));
	if (bad) throw new Error(`${file} ${language}: a common mistake is not a "- " bullet: ${bad.slice(0, 60)}`);
	return lines.map((line) => squash(line.slice(2)));
}

function parseSelfCheck(text, language, file) {
	return text
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => {
			const item = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s+(.+)$/);
			if (!item) throw new Error(`${file} ${language}: a self-check line is not "1. **Question?** Answer.": ${line.slice(0, 60)}`);
			return { question: squash(item[1]), answer: squash(item[2]) };
		});
}

/** The body of one language, from the five sections that follow "### EN: ..." or "### UA: ...". */
function parseLanguage(parts, language, file) {
	const [short, example, mistakes, selfCheck, detailed] = parts;
	return {
		short: squash(short),
		example: squash(example),
		mistakes: parseList(mistakes, language, file),
		selfCheck: parseSelfCheck(selfCheck, language, file),
		...parseDetailed(detailed, language, file),
	};
}

/** The lesson number and both titles, from the "## N. English / Ukrainian" heading. */
export function parseHeading(source, file) {
	const head = source.match(/^##\s*(\d+)\.\s*(.+?)\s*$/m);
	const title = head && splitTitle(head[2]);
	if (!title) throw new Error(`${file}: no "## N. English / Ukrainian" heading`);
	return { number: Number(head[1]), title };
}

export function parse(source, file) {
	const text = source.replace(/\r/g, '').trim();
	const { number, title } = parseHeading(text, file);
	const parts = text.split(/\n###\s*/).slice(1);
	const names = parts.map((part) => part.split('\n', 1)[0].trim());
	const expected = [...SECTIONS.en.map((name) => `EN: ${name}`), ...SECTIONS.ua.map((name) => `UA: ${name}`)];
	if (names.join('|') !== expected.join('|')) throw new Error(`${file}: sections are ${names.join(', ')}`);
	const body = parts.map((part) => part.slice(part.indexOf('\n') + 1).trim());
	return {
		number,
		title,
		en: parseLanguage(body.slice(0, 5), 'en', file),
		ua: parseLanguage(body.slice(5), 'ua', file),
	};
}

/** The lessons named in an English "Related theories" text, matched by title, longest first. */
export function relatedOf(lesson, lessons) {
	const found = new Set();
	const names = lessons.flatMap((other) => {
		const full = other.title.en;
		const bare = full.replace(/\s*\(.*?\)\s*/g, ' ');
		return [full, bare].map((name) => ({ number: other.number, name: key(name) }));
	});
	names.sort((a, b) => b.name.length - a.name.length);
	let rest = ` ${key(lesson.en.related)} `;
	for (const { number, name } of names) {
		if (name.length > 3 && rest.includes(` ${name} `)) {
			found.add(number);
			rest = rest.replaceAll(` ${name} `, ' | ');
		}
	}
	found.delete(lesson.number);
	return [...found];
}
