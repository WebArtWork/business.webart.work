export const environment: {
	apiUrl: string;
	appVersion: string;
	production: boolean;
	companyId: string;
	defaultLanguage: string;
	languages: AppLanguage[];
	/** Public web config: safe to ship. Access is enforced by Firebase Auth and Firestore rules. */
	firebase: {
		apiKey: string;
		authDomain: string;
		projectId: string;
		storageBucket: string;
		messagingSenderId: string;
		appId: string;
		measurementId: string;
	};
} = {
	apiUrl: '',
	appVersion: '1.0.0',
	production: true,
	companyId: '',
	firebase: {
		apiKey: 'AIzaSyB2c85PUyTpz8Y92xGJDki2LAteOhQ-hY4',
		authDomain: 'learning-c2766.firebaseapp.com',
		projectId: 'learning-c2766',
		storageBucket: 'learning-c2766.firebasestorage.app',
		messagingSenderId: '232437004513',
		appId: '1:232437004513:web:8712a0949537a694611fa0',
		measurementId: 'G-47F1HP9G2M',
	},
	defaultLanguage: 'en',
	languages: [
		{
			code: 'en',
			name: 'English',
			nativeName: 'English',
			flagSrc: 'flags/united-kingdom.svg',
			htmlLang: 'en',
			population: 280,
		},
		{
			code: 'ua',
			name: 'Ukrainian',
			nativeName: 'Українська',
			flagSrc: 'flags/ukraine.svg',
			htmlLang: 'uk',
			population: 35,
		},
	],
};

export interface AppLanguage {
	code: string;
	name: string;
	nativeName: string;
	flagSrc: string;
	htmlLang: string;
	population: number;
}
