# Business

A business learning platform at [business.webart.work](https://business.webart.work). Business
theories and frameworks (strategy, startups, marketing, finance, operations, leadership and decision
making), each with a short and a detailed version, in English and Ukrainian, followed by practice
sets that test them.

## Stack

Angular 22 with SSR prerender and Tailwind CSS. Firebase (project `learning-c2766`) for guest and
Google sign-in and saved progress. Conventions come from `@wawjs/ngx-default`; see `AGENTS.md`.

## Content

The content is data, empty until the business theories are added:

- `src/data/theory/catalog.json`: modules and lesson cards (slug, module, minutes, EN/UA title and summary).
- `src/data/theory/topics/<slug>.json`: a lesson's text, registered in `src/app/feature/theory/theory.loaders.ts`.
- `src/data/practice/<slug>.json` and `src/data/practice/keys/<slug>.json`: a lesson's questions and answer
  keys, registered in `src/app/feature/practice/practice.loaders.ts`.
- `src/data/glossary/glossary.json`: glossary sections and terms.
- `src/app/feature/dashboard/priority.ts`: the learning path order of the modules.

## Commands

```bash
npm start        # dev server
npm run build    # production build and prerender into dist/app/browser
```

## Deploy

GitHub Pages through `.github/workflows/deploy.yml`, with `CNAME` set to `business.webart.work`.

## License

GPL-3.0-or-later.
