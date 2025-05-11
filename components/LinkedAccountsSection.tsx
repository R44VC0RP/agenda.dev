"use client"

import { useState, useEffect } from "react"
import { FaGoogle, FaGithub } from "react-icons/fa"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

// Update the Account interface to match better-auth's structure
interface Account {
  id: string
  provider: string
  accountId: string
  userId?: string
  createdAt: string | Date
  updatedAt: string | Date
  scopes?: string[]
}

// only Google and GitHub can be linked
type SupportedProvider = "google" | "github"

interface LinkedAccountsProps {
  className?: string
}

export default function LinkedAccountsSection({ className }: LinkedAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState<Record<SupportedProvider, boolean>>({} as Record<SupportedProvider, boolean>)

  // Load linked accounts on mount
  useEffect(() => {
    fetchLinkedAccounts()
  }, [])

  const fetchLinkedAccounts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await authClient.listAccounts()
      console.log("response", response)
      
      // Handle response which might have a data property or be the data itself
      const accountsData = response.data
      
      // Ensure accountsData is an array before setting it
      setAccounts(Array.isArray(accountsData) ? accountsData as unknown as Account[] : [])
    } catch (err) {
      console.error("Error fetching account info:", err)
      setError("Failed to load account information. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderName = (provider: string): string => {
    switch (provider) {
      case "google": return "Google"
      case "github": return "GitHub"
      default: return provider
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google": return <FaGoogle className="h-5 w-5 text-[#4285F4]" />
      case "github": return <FaGithub className="h-5 w-5 text-[#24292E]" />
      default: return null
    }
  }

  // trigger linking flow
  const handleLink = async (provider: SupportedProvider) => {
    setLinking(prev => ({ ...prev, [provider]: true }))
    try {
      const { data, error: linkError } = await authClient.linkSocial({ provider, callbackURL: window.location.href })
      if (linkError) throw linkError
      if (data?.url) window.location.href = data.url
    } catch (err: any) {
      console.error("Error linking account:", err)
      setError(err.message || "Failed to link account")
    } finally {
      setLinking(prev => ({ ...prev, [provider]: false }))
    }
  }

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
      ) : accounts.length > 0 ? (
        <div className="space-y-4">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center gap-3 py-3 border-t">
              {getProviderIcon(account.provider)}
              <div>
                <p className="font-medium">{getProviderName(account.provider)} Account</p>
                <p className="text-sm text-muted-foreground">
                  Connected since {new Date(account.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-3 text-sm text-muted-foreground">
          No account information available
        </div>
      )}

      {/* only show link buttons when accounts loaded */}
      {!isLoading && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-lg font-medium mb-2">Link Additional Accounts</h3>
          <div className="flex flex-wrap gap-2">
            {( [ 'google', 'github' ] as SupportedProvider[] )
              .filter(provider => !accounts.some(a => a.provider === provider))
              .map(provider => (
                <Button
                  key={provider}
                  onClick={() => handleLink(provider)}
                  disabled={!!linking[provider]}
                >
                  {linking[provider]
                    ? <Loader2 className="animate-spin h-4 w-4" />
                    : `Link ${getProviderName(provider)}`
                  }
                </Button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
} 