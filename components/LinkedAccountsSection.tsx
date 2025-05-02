'use client';

import { useState, useEffect } from 'react';
import { FaGoogle, FaGithub, FaTwitter } from 'react-icons/fa';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authClient } from '@/lib/auth-client';

// Update the Account interface to match better-auth's structure
interface Account {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  scopes?: string[];
}

interface LinkedAccountsProps {
  className?: string;
}

export default function LinkedAccountsSection({ className }: LinkedAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load linked accounts on mount
  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.listAccounts();

      // Handle response which might have a data property or be the data itself
      const accountsData = response.data || response;

      // Ensure accountsData is an array before setting it
      setAccounts(Array.isArray(accountsData) ? (accountsData as unknown as Account[]) : []);
    } catch (err) {
      console.error('Error fetching account info:', err);
      setError('Failed to load account information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderName = (providerId: string): string => {
    switch (providerId) {
      case 'google':
        return 'Google';
      case 'github':
        return 'GitHub';
      case 'twitter':
        return 'Twitter';
      default:
        return providerId;
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return <FaGoogle className="h-5 w-5 text-[#4285F4]" />;
      case 'github':
        return <FaGithub className="h-5 w-5 text-[#24292E]" />;
      case 'twitter':
        return <FaTwitter className="h-5 w-5 text-[#1DA1F2]" />;
      default:
        return null;
    }
  };

  const getCurrentAccount = () => {
    if (!Array.isArray(accounts) || accounts.length === 0) return null;
    return accounts[0]; // Return the first account since we don't support linking
  };

  const currentAccount = getCurrentAccount();

  return (
    <div className={className}>
      <h2 className="text-xl font-semibold tracking-tight mb-6">Account Information</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : currentAccount ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 py-3 border-t">
            {getProviderIcon(currentAccount.providerId)}
            <div>
              <p className="font-medium">{getProviderName(currentAccount.providerId)} Account</p>
              <p className="text-sm text-muted-foreground">
                Connected since {new Date(currentAccount.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-3 text-sm text-muted-foreground">No account information available</div>
      )}
    </div>
  );
}
