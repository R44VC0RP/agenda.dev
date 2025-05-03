import { FaTwitter } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';

export default function TwitterSignInButton() {
  const _handleTauriAuth = null;
  const handleTwitterSignIn = async () => {
    await signIn.social({
      provider: 'twitter',
      callbackURL: '/', // Redirect after sign in
    });
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
