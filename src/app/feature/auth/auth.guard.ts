import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sign-in page: someone already signed in with Google goes straight to the profile; guests may sign in. */
export const guestGuard: CanActivateFn = async () => {
	const auth = inject(AuthService);
	const router = inject(Router);
	const user = await auth.whenReady();
	return user && !user.isAnonymous ? router.parseUrl('/profile') : true;
};
