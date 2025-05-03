import { FaTwitter } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';

/**
 * Renders a button that initiates Twitter sign-in using a social authentication provider.
 *
 * When clicked, attempts to sign in the user via Twitter and redirects to the home page upon success.
 */
export default function TwitterSignInButton() {
  const handleTwitterSignIn = async () => {
    try {
      await signIn.social({
        provider: 'twitter',
        callbackURL: '/', // Redirect after sign in
      });
    } catch (error) {
      console.error('Twitter sign in failed:', error);
    }
  };

  return (
    <button
      onClick={handleTwitterSignIn}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white bg-[#000000] hover:bg-[#000000] transition-colors rounded-lg font-medium"
    >
      <FaTwitter className="w-5 h-5" />
      <span>Sign in with X</span>
    </button>
  );
}
