'use client';

import { useState } from 'react';
import { useSession, authClient } from '@/lib/auth-client';
import { Settings, LogOut, Bell } from 'lucide-react';
import { FaUser } from 'react-icons/fa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SettingsDialog from './SettingsDialog';
import RemindersDialog from './RemindersDialog';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import GoogleSignInButton from './GoogleSignInButton';
import GithubSignInButton from './GithubSignInButton';
import TwitterSignInButton from './TwitterSignInButton';

export default function LoginButton() {
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const _debugAuth = false;

  if (session?.user) {
    const initials = session.user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-white dark:bg-[#131316] flex items-center justify-center shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200 outline-none">
              <Avatar className="h-7 w-7">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 truncate">
              <span className="font-normal text-muted-foreground">Signed in as</span>
              <span className="truncate">{session.user.name}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => setShowReminders(true)}>
              <Bell className="h-4 w-4" />
              Reminders
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              onClick={() => {
                // Clear local storage before signing out
                localStorage.removeItem('todos');
                localStorage.removeItem('showCompleted');
                localStorage.removeItem('isTableView');
                localStorage.removeItem('currentWorkspace');
                authClient.signOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

        <RemindersDialog open={showReminders} onOpenChange={setShowReminders} />
      </>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center gap-2 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24)] transition-colors duration-200">
          <FaUser className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-900 dark:text-white">Sign In</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm w-full p-2">
        <DialogHeader>
          <DialogTitle>Sign in to agenda.dev</DialogTitle>
          <DialogDescription>Choose a login method</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <GoogleSignInButton />
          <GithubSignInButton />
          <TwitterSignInButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
