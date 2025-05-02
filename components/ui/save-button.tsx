import { Button } from '@/components/ui/button';
import React from 'react';

export default function SaveButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="default"
      onClick={onClick}
      className="h-7 px-3 py-0 rounded-[99px] text-[13px] font-medium text-white bg-gradient-to-b from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.2)] transition-all duration-200"
    >
      Save
    </Button>
  );
}
