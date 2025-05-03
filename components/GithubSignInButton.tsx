import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function GithubSignInButton() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGithubSignIn = async () => {
    try {
      setIsSigningIn(true);

      // Use regular OAuth flow with passive platform authentication
      await signIn.social({
        provider: 'github',
        callbackURL: '/', // Redirect after sign in
        usePasskeys: true, // This enables passkey authentication if available
      });
    } catch (error) {
      console.error('GitHub sign in failed:', error);
      toast.error('Failed to sign in with GitHub');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <button
      onClick={handleGithubSignIn}
      disabled={isSigningIn}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white bg-[#24292E] hover:bg-[#3c4146] transition-colors rounded-lg font-medium"
    >
      <FaGithub className="w-5 h-5" />
      <span>{isSigningIn ? 'Signing in...' : 'Sign in with GitHub'}</span>
    </button>
  );
}
