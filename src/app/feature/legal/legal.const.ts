/** Where people reach us about privacy and their data. */
export const CONTACT_EMAIL = 'ceo@webart.work';

/** This app's source code, published under the GPL. */
export const SOURCE_URL = 'https://github.com/WebArtWork/business.webart.work';

export interface Credit {
	name: string;
	/** What it does in this app. English; the licenses page translates it, like `author`. */
	use: string;
	author: string;
	license: string;
	url: string;
	/** A local copy of the license text, when we ship one. */
	licenseUrl?: string;
}

/** Third-party work the app ships or shows. The full list of bundled packages is in /3rdpartylicenses.txt. */
export const CREDITS: Credit[] = [
	{
		name: 'Solar icons',
		use: 'Icons in the light theme.',
		author: '480 Design',
		license: 'CC BY 4.0',
		url: 'https://www.figma.com/community/file/1166831539721848736',
	},
	{
		name: 'Iconoir',
		use: 'Icons in the dark theme.',
		author: 'Luca Burgio and contributors',
		license: 'MIT',
		url: 'https://iconoir.com',
	},
	{
		name: 'Inter and Inter Tight',
		use: 'The fonts, bundled with the app through Fontsource.',
		author: 'Rasmus Andersson',
		license: 'SIL Open Font License 1.1',
		url: 'https://rsms.me/inter/',
	},
	{
		name: 'Angular',
		use: 'The app framework.',
		author: 'Google',
		license: 'MIT',
		url: 'https://angular.dev',
	},
	{
		name: 'Firebase JavaScript SDK',
		use: 'Sign-in and saved data.',
		author: 'Google',
		license: 'Apache-2.0',
		url: 'https://github.com/firebase/firebase-js-sdk',
	},
	{
		name: 'Capacitor',
		use: 'The iOS and Android apps.',
		author: 'Ionic',
		license: 'MIT',
		url: 'https://capacitorjs.com',
	},
	{
		name: 'Tailwind CSS',
		use: 'Styling.',
		author: 'Tailwind Labs',
		license: 'MIT',
		url: 'https://tailwindcss.com',
	},
];
