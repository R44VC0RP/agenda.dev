import { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function GoogleSignInButton() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);

      // Use regular OAuth flow with passive platform authentication
      await signIn.social({
        provider: 'google',
        callbackURL: '/', // Redirect after sign in
        usePasskeys: true, // This enables passkey authentication if available
      });
    } catch (error) {
      console.error('Google sign in failed:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isSigningIn}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white bg-[#4285F4] hover:bg-[#357ABD] transition-colors rounded-lg font-medium"
    >
      <FaGoogle className="w-5 h-5" />
      <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
    </button>
  );
}
