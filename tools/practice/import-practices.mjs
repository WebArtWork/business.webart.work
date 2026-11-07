// Turns the practice sources in content/practices/NN.md into the app data:
//   src/data/practice/questions/<slug>.json (what the page shows), src/data/practice/keys/<slug>.json
//   (answers, loaded only when they are checked) and src/app/feature/practice/practice.loaders.ts,
//   plus an SEO entry per exercise page in src/data/company/company.json.
// Run after the theories: npm run practices:import
// Check only, writing nothing: node tools/practice/import-practices.mjs --check [01.md 02.md ...]
//
// A source is the lesson's heading, then "### EN" and "### UA", each with the same 15 questions:
//
//   #### Q1 · single_choice · foundation · 1
//   The prompt: paragraphs, "> " quotes and "- " bullets; **bold** where it helps.
//   A) First option
//   B) Second option
//   **Answer:** B
//   **Why:** Why B is right and the others are not.
//
// true_false: no options, "**Answer:** true" or "false". multiple_select: exactly two right letters,
// "**Answer:** A, C". Written types (short_answer, business_decision, case_study) have no options or
// answer; they end with "**Sample:** ..." and "**Rubric:**" followed by "- 2 | what the point is for" rows.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apostrophes, parseHeading } from '../theory/theory-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = path.join(root, 'content/practices');
const DATA = path.join(root, 'src/data/practice');

const AUTO = ['single_choice', 'true_false', 'multiple_select', 'scenario_choice'];
const WRITTEN = ['short_answer', 'business_decision', 'case_study'];
const DIFFICULTIES = ['foundation', 'applied', 'advanced', 'expert'];
/** Must match QUIZ_POINTS and WRITTEN_POINTS in src/app/feature/practice/practice.data.ts. */
const QUIZ = { count: 10, points: 13 };
const WRITTEN_TOTAL = { count: 5, points: 24 };

/** "Some **bold** text" as runs. */
const runs = (text) =>
	text
		.split('**')
		.map((t, index) => (index % 2 ? { t, b: true } : { t }))
		.filter((run) => run.t);

/** Lines of prose as blocks: paragraphs, "> " quotes and "- " lists. */
function blocks(lines) {
	const result = [];
	for (const line of lines) {
		const text = line.trim();
		if (!text) continue;
		const last = result.at(-1);
		if (text.startsWith('- ')) {
			if (last?.k === 'ul') last.items.push(runs(text.slice(2)));
			else result.push({ k: 'ul', items: [runs(text.slice(2))] });
		} else if (text.startsWith('> ')) result.push({ k: 'quote', runs: runs(text.slice(2)) });
		else result.push({ k: 'p', runs: runs(text) });
	}
	return result;
}

function parseQuestion(text, where) {
	const [head, ...lines] = text.split('\n');
	const parts = head.split('·').map((part) => part.trim());
	const [id, type, difficulty, pointsText] = parts;
	const points = Number(pointsText);
	if (parts.length !== 4 || !/^Q\d+$/.test(id)) throw new Error(`${where}: heading "${head}" is not "Q1 · type · difficulty · points"`);
	if (![...AUTO, ...WRITTEN].includes(type)) throw new Error(`${where} ${id}: unknown type ${type}`);
	if (!DIFFICULTIES.includes(difficulty)) throw new Error(`${where} ${id}: unknown difficulty ${difficulty}`);
	if (!Number.isInteger(points) || points < 1) throw new Error(`${where} ${id}: points must be a whole number`);

	const prompt = [];
	const options = [];
	const fields = {};
	const rubric = [];
	let field = null;
	for (const line of lines) {
		const label = line.match(/^\*\*(Answer|Why|Sample|Rubric):\*\*\s*(.*)$/);
		const option = line.match(/^([A-F])\)\s+(.+)$/);
		const row = line.match(/^- (\d+) \| (.+)$/);
		if (label) {
			field = label[1];
			fields[field] = label[2] ? [label[2]] : [];
		} else if (field === 'Rubric' && row) rubric.push({ criterion: row[2].trim(), points: Number(row[1]) });
		else if (field) fields[field].push(line);
		else if (option) options.push({ id: option[1], text: option[2].trim() });
		else prompt.push(line);
	}
	const question = { id: id.toLowerCase(), type, difficulty, points, prompt: blocks(prompt) };
	const key = {};
	if (!question.prompt.length) throw new Error(`${where} ${id}: no prompt`);

	if (AUTO.includes(type)) {
		const answer = (fields.Answer ?? []).join(' ').trim();
		if (!answer) throw new Error(`${where} ${id}: no **Answer:**`);
		if (!fields.Why?.join('').trim()) throw new Error(`${where} ${id}: no **Why:**`);
		key.explanation = blocks(fields.Why);
		if (type === 'true_false') {
			if (options.length) throw new Error(`${where} ${id}: true_false has no options`);
			if (!/^(true|false)$/.test(answer)) throw new Error(`${where} ${id}: answer must be true or false`);
			key.correct = answer === 'true';
		} else {
			const ids = options.map((item) => item.id);
			if (ids.join('') !== 'ABCDEF'.slice(0, ids.length) || ids.length < 3 || ids.length > 5)
				throw new Error(`${where} ${id}: options must be A) to C), D) or E)`);
			const correct = answer.split(/\s*,\s*/);
			const need = type === 'multiple_select' ? 2 : 1;
			if (correct.length !== need || correct.some((letter) => !ids.includes(letter)) || new Set(correct).size !== need)
				throw new Error(`${where} ${id}: ${type} needs exactly ${need} right option(s), got "${answer}"`);
			question.options = options;
			key.correct = correct;
		}
	} else {
		if (options.length || fields.Answer) throw new Error(`${where} ${id}: a written question has no options or answer`);
		if (!fields.Sample?.join('').trim()) throw new Error(`${where} ${id}: no **Sample:**`);
		const sum = rubric.reduce((total, item) => total + item.points, 0);
		if (rubric.length < 2 || sum !== points) throw new Error(`${where} ${id}: rubric rows must add up to ${points}, got ${sum}`);
		key.sample = blocks(fields.Sample);
		key.rubric = rubric;
		if (fields.Why?.join('').trim()) key.explanation = blocks(fields.Why);
	}
	return { question, key };
}

function parseLanguage(text, where) {
	const parts = text.split(/\n####\s+/).slice(1);
	const items = parts.map((part) => parseQuestion(part.trim(), where));
	const ids = items.map((item) => item.question.id);
	const expected = Array.from({ length: QUIZ.count + WRITTEN_TOTAL.count }, (_, index) => `q${index + 1}`);
	if (ids.join() !== expected.join()) throw new Error(`${where}: questions must be Q1 to Q15 in order, got ${ids.join(', ')}`);
	const auto = items.filter((item) => AUTO.includes(item.question.type));
	const written = items.filter((item) => WRITTEN.includes(item.question.type));
	if (items.findIndex((item) => WRITTEN.includes(item.question.type)) !== QUIZ.count)
		throw new Error(`${where}: the first ${QUIZ.count} questions are checked ones, the last ${WRITTEN_TOTAL.count} written`);
	const total = (list) => list.reduce((sum, item) => sum + item.question.points, 0);
	if (auto.length !== QUIZ.count || total(auto) !== QUIZ.points)
		throw new Error(`${where}: checked questions are worth ${total(auto)} points, need ${QUIZ.points}`);
	if (written.length !== WRITTEN_TOTAL.count || total(written) !== WRITTEN_TOTAL.points)
		throw new Error(`${where}: written questions are worth ${total(written)} points, need ${WRITTEN_TOTAL.points}`);
	return items;
}

export function parsePractice(source, file) {
	const text = source.replace(/\r/g, '').trim();
	const { number, title } = parseHeading(text, file);
	if (text.includes('—')) throw new Error(`${file}: em dash; use a colon, comma, "це" or a new sentence`);
	const mixed = text.match(/[^\s.,;:!?()«»"'’]*(?:[а-яіїєґ][a-z]|[a-z][а-яіїєґ])[^\s.,;:!?()«»"'’]*/i);
	if (mixed) throw new Error(`${file}: "${mixed[0]}" mixes Latin and Cyrillic letters`);
	const sections = text.split(/\n###\s+/).slice(1);
	const names = sections.map((section) => section.split('\n', 1)[0].trim());
	if (names.join('|') !== 'EN|UA') throw new Error(`${file}: sections are ${names.join(', ')}, need EN and UA`);
	const en = parseLanguage(sections[0], `${file} EN`);
	const ua = parseLanguage(sections[1], `${file} UA`);
	en.forEach((item, index) => {
		const other = ua[index];
		const same = ['type', 'difficulty', 'points'].every((field) => item.question[field] === other.question[field]);
		if (!same || JSON.stringify(item.key.correct) !== JSON.stringify(other.key.correct))
			throw new Error(`${file} Q${index + 1}: EN and UA differ in type, difficulty, points or answer`);
		if ((item.question.options?.length ?? 0) !== (other.question.options?.length ?? 0))
			throw new Error(`${file} Q${index + 1}: EN and UA have different numbers of options`);
		if (item.key.rubric && item.key.rubric.map((row) => row.points).join() !== other.key.rubric.map((row) => row.points).join())
			throw new Error(`${file} Q${index + 1}: EN and UA rubrics differ in points`);
	});
	return { number, title, en, ua };
}

const check = process.argv.includes('--check');
const asked = process.argv.slice(2).filter((arg) => arg !== '--check').map((name) => path.basename(name));
const files = (await readdir(SOURCE)).filter((name) => /^\d+\.md$/.test(name)).sort();
const catalog = JSON.parse(await readFile(path.join(root, 'src/data/theory/catalog.json'), 'utf8')).topics;

const errors = [];
const sets = [];
for (const file of check && asked.length ? asked : files) {
	try {
		const practice = parsePractice(await readFile(path.join(SOURCE, file), 'utf8'), file);
		const card = catalog.find((topic) => topic.number === practice.number);
		if (!card || apostrophes(card.title.en) !== apostrophes(practice.title.en))
			throw new Error(`${file}: heading does not match lesson ${practice.number} in the theory catalog`);
		sets.push({ ...practice, slug: card.slug });
	} catch (error) {
		errors.push(error.message);
	}
}
for (const error of errors) console.error(`error ${error}`);
if (check) {
	console.log(`${sets.length + errors.length} source(s) checked: ${errors.length} error(s).`);
	process.exit(errors.length ? 1 : 0);
}
if (errors.length) process.exit(1);

await rm(DATA, { recursive: true, force: true });
await mkdir(path.join(DATA, 'questions'), { recursive: true });
await mkdir(path.join(DATA, 'keys'), { recursive: true });
const json = (value) => JSON.stringify(value, null, '\t') + '\n';
for (const set of sets) {
	const questions = { slug: set.slug, topicId: set.number, questions: { en: set.en.map((item) => item.question), ua: set.ua.map((item) => item.question) } };
	const keys = {
		en: Object.fromEntries(set.en.map((item) => [item.question.id, item.key])),
		ua: Object.fromEntries(set.ua.map((item) => [item.question.id, item.key])),
	};
	await writeFile(path.join(DATA, 'questions', `${set.slug}.json`), json(questions));
	await writeFile(path.join(DATA, 'keys', `${set.slug}.json`), json(keys));
}

const loader = (folder) =>
	sets.map((set) => `\t'${set.slug}': () => import('../../../data/practice/${folder}/${set.slug}.json'),`).join('\n');
await writeFile(
	path.join(root, 'src/app/feature/practice/practice.loaders.ts'),
	`// Generated by tools/practice/import-practices.mjs from content/practices: one lazy chunk per lesson,\n// answer keys apart from the questions.\nexport const QUESTION_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n${loader('questions')}\n};\n\nexport const KEY_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {\n${loader('keys')}\n};\n`,
);

// one SEO entry per exercise page; the other pages keep theirs
const companyFile = path.join(root, 'src/data/company/company.json');
const company = JSON.parse(await readFile(companyFile, 'utf8'));
const pageSeo = Object.fromEntries(Object.entries(company.pageSeo).filter(([route]) => !route.startsWith('/practices/')));
for (const set of sets)
	pageSeo[`/practices/${set.slug}`] = {
		title: `${set.title.en}: practice`,
		description: `Ten checked questions and five written business tasks on ${set.title.en}, with sample answers and a scoring rubric.`,
		image: '/seo/practice.jpg',
	};
company.pageSeo = pageSeo;
await writeFile(companyFile, json(company));

console.log(`Imported ${sets.length} practice sets.`);
