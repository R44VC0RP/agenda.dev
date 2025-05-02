'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FaBell, FaTimes } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

interface Reminder {
  id: string;
  title: string;
  description: string;
  reminderTime: string;
  status: 'pending' | 'sent' | 'cancelled';
  todoId: string;
}

interface RemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemindersDialog({ open, onOpenChange }: RemindersDialogProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchReminders();
    }
  }, [open]);

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reminders');
      if (!response.ok) {
        throw new Error('Failed to fetch reminders');
      }
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReminder = async (id: string) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel reminder');
      }

      // Update local state
      setReminders((prev) =>
        prev.map((reminder) =>
          reminder.id === id ? { ...reminder, status: 'cancelled' } : reminder
        )
      );
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20';
      case 'sent':
        return 'bg-green-500/10 text-green-500 dark:bg-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 dark:bg-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] sm:h-[600px] overflow-hidden bg-background">
        <DialogHeader className="px-6 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FaBell className="w-5 h-5" />
            Reminders
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FaBell className="w-8 h-8 mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No reminders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{reminder.title}</h3>
                        <Badge variant="secondary" className={getStatusColor(reminder.status)}>
                          {reminder.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{reminder.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reminder.reminderTime), { addSuffix: true })}
                      </p>
                    </div>
                    {reminder.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelReminder(reminder.id)}
                        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <FaTimes className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
