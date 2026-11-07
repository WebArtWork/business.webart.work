import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PreferencesComponent } from '../../components/preferences/preferences.component';
import { AuthService } from '../../feature/auth/auth.service';
import { TPipe } from '../../feature/i18n/t.pipe';

const SILENT_ERROR_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

@Component({
	imports: [NgOptimizedImage, PreferencesComponent, TPipe],
	templateUrl: './sign-in.component.html',
})
export class SignInComponent {
	private readonly _auth = inject(AuthService);
	private readonly _router = inject(Router);

	protected readonly pending = signal(false);
	protected readonly error = signal<string | null>(null);

	protected async signIn() {
		this.pending.set(true);
		this.error.set(null);

		try {
			await this._auth.signInWithGoogle();
			await this._router.navigateByUrl('/profile');
		} catch (error) {
			const code = (error as { code?: string }).code ?? '';
			if (!SILENT_ERROR_CODES.has(code)) {
				console.error(error);
				this.error.set(_errorMessage(code));
			}
		} finally {
			this.pending.set(false);
		}
	}
}

/** In English; the template translates it. */
function _errorMessage(code: string): string {
	switch (code) {
		case 'auth/popup-blocked':
			return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
		case 'auth/account-exists-with-different-credential':
			return 'This email already uses a different sign-in method.';
		case 'auth/network-request-failed':
			return 'No connection. Check your network and try again.';
		case 'auth/credential-already-in-use':
			return 'This Google account is already in use. Try again to sign in with it.';
		case 'auth/unauthorized-domain':
			return 'Sign-in is not enabled for this address yet.';
		default:
			return 'Could not sign in. Try again in a moment.';
	}
}
