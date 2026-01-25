'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Registration page now redirects to login since we use OAuth-only authentication.
 * Users will sign in with Google/GitHub and then complete their profile.
 */
export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to login - we now use OAuth only
        router.replace('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    );
}
