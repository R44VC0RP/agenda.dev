'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NewWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export default function NewWorkspaceDialog({ isOpen, onClose, onSubmit }: NewWorkspaceDialogProps) {
  const [name, setName] = React.useState('');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New Workspace</DialogTitle>
            <Button variant="icon" onClick={onClose}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-[6px] text-[13px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-transparent dark:border-white/[0.08] focus:border-[#7c5aff] dark:focus:border-[#7c5aff] focus:ring-0 outline-none transition-colors"
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (name.trim()) {
                onSubmit(name.trim());
                setName('');
                onClose();
              }
            }}
            disabled={!name.trim()}
            weight="medium"
          >
            Create Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
