import { FaGoogle } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';

export default function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/', // Redirect to dashboard after sign in
    });
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white bg-[#4285F4] hover:bg-[#357ABD] transition-colors rounded-lg font-medium"
    >
      <FaGoogle className="w-5 h-5" />
      <span>Sign in with Google</span>
    </button>
  );
}
