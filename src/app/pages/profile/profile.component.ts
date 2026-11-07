import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PreferencesComponent } from '../../components/preferences/preferences.component';
import { AuthService, userPhoto } from '../../feature/auth/auth.service';
import { I18nService } from '../../feature/i18n/i18n.service';
import { TPipe } from '../../feature/i18n/t.pipe';

const SILENT_ERROR_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/** Who you are (a guest or a Google account), how far you got, the appearance and language, and the account. */
@Component({
	imports: [PreferencesComponent, RouterLink, TPipe],
	templateUrl: './profile.component.html',
})
export class ProfileComponent {
	private readonly _auth = inject(AuthService);
	private readonly _router = inject(Router);
	private readonly _i18n = inject(I18nService);

	protected readonly user = this._auth.user;
	protected readonly photo = computed(() => userPhoto(this.user()));
	protected readonly isGuest = this._auth.isGuest;
	protected readonly pending = signal(false);
	protected readonly signingOut = signal(false);
	protected readonly confirmingDelete = signal(false);
	protected readonly deleting = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly name = computed(() => {
		const user = this.user();
		return user?.displayName || user?.email || this._i18n.t('Guest');
	});
	protected readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase());

	protected async signIn() {
		this.pending.set(true);
		this.error.set(null);
		try {
			await this._auth.signInWithGoogle();
		} catch (error) {
			const code = (error as { code?: string }).code ?? '';
			if (!SILENT_ERROR_CODES.has(code)) {
				console.error(error);
				this.error.set('Could not sign in. Try again in a moment.');
			}
		} finally {
			this.pending.set(false);
		}
	}

	protected async signOut() {
		this.signingOut.set(true);
		try {
			await this._auth.signOut();
			await this._router.navigateByUrl('/');
		} finally {
			this.signingOut.set(false);
		}
	}

	protected async deleteAccount() {
		this.deleting.set(true);
		this.error.set(null);
		try {
			await this._auth.deleteAccount();
			// a full reload, so nothing from the deleted user stays in memory
			window.location.assign('/');
		} catch (error) {
			console.error('Could not delete the data.', error);
			const closed = (error as { code?: string }).code === 'auth/popup-closed-by-user';
			this.error.set(
				closed
					? 'Sign-in was cancelled, so nothing was deleted.'
					: 'Could not delete your data. Check your connection and try again.',
			);
			this.deleting.set(false);
		}
	}
}
