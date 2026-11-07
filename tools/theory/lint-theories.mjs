// Checks the theory sources in content/theories before they are imported.
// Run: node tools/theory/lint-theories.mjs [01.md 02.md ...]   (no files: all of them)
// Errors: a source that does not parse, an em dash, a related theory that is not a lesson title, a sentence
// that another source repeats word for word. Warnings: a section outside its usual length.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseHeading, relatedOf, words } from './theory-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = path.join(root, 'content/theories');

/** Usual length of each part, in words: [min, max]. */
const LENGTH = {
	short: [25, 75],
	example: [50, 150],
	origin: [25, 110],
	core: [40, 140],
	components: [40, 170],
	apply: [40, 150],
	limitations: [30, 120],
};
const COUNT = { mistakes: [3, 4], selfCheck: [3, 4] };

const all = (await readdir(SOURCE)).filter((name) => /^\d+\.md$/.test(name)).sort();
const asked = process.argv.slice(2).map((name) => path.basename(name));
const checked = asked.length ? asked : all;

const errors = [];
const warnings = [];
const sources = new Map();
const lessons = [];
/** Every lesson's number and titles, also from sources that do not parse yet: what related theories match. */
const headings = [];
for (const file of all) {
	const text = await readFile(path.join(SOURCE, file), 'utf8');
	sources.set(file, text);
	try {
		headings.push(parseHeading(text, file));
	} catch {}
	try {
		lessons.push({ file, ...parse(text, file) });
	} catch (error) {
		if (checked.includes(file)) errors.push(error.message);
	}
}

const sentences = (text) =>
	text
		.replace(/\*\*/g, '')
		.split(/(?<=[.!?])\s+/)
		.map((sentence) => sentence.trim().toLowerCase())
		.filter((sentence) => words(sentence) >= 7);
const texts = (body) => [
	body.short,
	body.example,
	body.origin,
	body.core,
	body.components,
	body.apply,
	body.limitations,
	...body.mistakes,
	...body.selfCheck.flatMap(({ question, answer }) => [question, answer]),
];

/** Where each long sentence appears, to catch text pasted into more than one lesson. */
const seen = new Map();
for (const lesson of lessons)
	for (const language of ['en', 'ua'])
		for (const sentence of new Set(texts(lesson[language]).flatMap(sentences)))
			seen.set(sentence, [...(seen.get(sentence) ?? []), lesson.file]);

for (const file of checked) {
	if (!sources.has(file)) {
		errors.push(`${file}: no such source`);
		continue;
	}
	const dashes = (sources.get(file).match(/—/g) ?? []).length;
	if (dashes) errors.push(`${file}: ${dashes} em dash(es); use a colon, comma, "це" or a new sentence`);
	const lesson = lessons.find((item) => item.file === file);
	if (!lesson) continue;
	if (relatedOf(lesson, headings).length < 2)
		errors.push(`${file}: "Related theories" must name at least two lesson titles exactly`);
	for (const language of ['en', 'ua']) {
		const body = lesson[language];
		for (const [field, [min, max]] of Object.entries(LENGTH)) {
			const count = words(body[field]);
			if (count < min || count > max) warnings.push(`${file} ${language} ${field}: ${count} words (usual ${min}-${max})`);
		}
		for (const [field, [min, max]] of Object.entries(COUNT)) {
			const count = body[field].length;
			if (count < min || count > max) errors.push(`${file} ${language} ${field}: ${count} items (need ${min}-${max})`);
		}
		for (const sentence of new Set(texts(body).flatMap(sentences))) {
			const others = seen.get(sentence).filter((other) => other !== file);
			if (others.length) errors.push(`${file} ${language}: sentence also in ${others.join(', ')}: "${sentence.slice(0, 80)}"`);
		}
	}
}

for (const warning of warnings) console.warn(`warn  ${warning}`);
for (const error of errors) console.error(`error ${error}`);
console.log(`${checked.length} source(s) checked: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exitCode = errors.length ? 1 : 0;
