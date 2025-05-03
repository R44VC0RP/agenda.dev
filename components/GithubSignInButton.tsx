import { FaGithub } from 'react-icons/fa';
import { signIn } from '@/lib/auth-client';

export default function GithubSignInButton() {
  const handleGithubSignIn = async () => {
    try {
      await signIn.social({
        provider: 'github',
        callbackURL: '/', // Redirect after sign in
      });
    } catch (error) {
      console.error('GitHub sign in failed:', error);
    }
  };

  return (
    <button
      onClick={handleGithubSignIn}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white bg-[#24292E] hover:bg-[#3c4146] transition-colors rounded-lg font-medium"
    >
      <FaGithub className="w-5 h-5" />
      <span>Sign in with GitHub</span>
    </button>
  );
}
