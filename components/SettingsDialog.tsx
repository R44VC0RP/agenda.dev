'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBrowserTimezone, addTimezoneHeader } from '@/lib/timezone-utils';
import Link from 'next/link';
import LinkedAccountsSection from './LinkedAccountsSection';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const [, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    reminderMinutes: 30,
    aiSuggestedReminders: false,
    weeklyReview: false,
    timezone: getBrowserTimezone(),
  });

  // Precompute timezone options with local timezone first
  const allTimezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const localTimezone = getBrowserTimezone();
  const timezoneOptions = useMemo(() => {
    const otherTzs = allTimezones.filter((tz) => tz !== localTimezone);
    return [localTimezone, ...otherTzs];
  }, [allTimezones, localTimezone]);

  // Prefetch settings on mount so dialog opens immediately with data
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsFetching(true);
        const response = await fetch('/api/user/settings', {
          headers: addTimezoneHeader(),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data = await response.json();
        setSettings(data);
      } catch (_error) {
        console.error('Error fetching settings:');
        toast({
          title: 'Error',
          description: 'Failed to load settings. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...addTimezoneHeader(),
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });

      // Refresh settings (using the effect's fetch function)
      // No need to call fetchSettings as it's no longer accessible here
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[70%] sm:h-[80%] flex flex-col overflow-hidden bg-background">
        <DialogHeader className="px-6 pt-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold tracking-tight">Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-8 overflow-y-auto flex-grow">
          {/* Linked Accounts Section */}
          <LinkedAccountsSection />

          {/* Email Alerts Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">Email Alerts</h2>

            <div className="space-y-4">
              <div className="flex items-start justify-between py-3 border-t">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Reminder notification time</Label>
                  <p className="text-sm text-muted-foreground">Minutes before a todo is due</p>
                </div>
                <Input
                  id="reminderMinutes"
                  type="number"
                  min={1}
                  value={settings.reminderMinutes}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      reminderMinutes: parseInt(e.target.value) || 30,
                    }))
                  }
                  className="w-20 h-10 text-right"
                />
              </div>

              <div className="flex items-start justify-between py-3 border-t">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Timezone</Label>
                  <p className="text-sm text-muted-foreground">
                    Your timezone for reminders and due dates
                  </p>
                </div>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      timezone: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between py-3 border-t">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">AI-suggested todo reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive AI-powered suggestions for new todos based on your patterns
                  </p>
                </div>
                <Switch
                  checked={settings.aiSuggestedReminders}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiSuggestedReminders: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-start justify-between py-3 border-t">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Weekly todo review</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of completed todos and productivity insights
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyReview}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      weeklyReview: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Subscription</h2>
            <div className="rounded-lg border bg-muted/5 p-4">
              <p className="text-sm text-muted-foreground">
                Premium features coming soon! Stay tuned for enhanced productivity tools and
                advanced AI capabilities.
              </p>
            </div>
          </div>

          {/* Legal Section */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Legal</h2>
            <div className="space-y-2">
              <div className="rounded-lg border bg-muted/5 p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Terms of Service</p>
                  <Link
                    href="/terms"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    View
                  </Link>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/5 p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Privacy Policy</p>
                  <Link
                    href="/privacy"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 px-6 py-3 border-t bg-muted/5 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[100px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
