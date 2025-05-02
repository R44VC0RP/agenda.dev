import * as React from 'react'
import { RotateCcw } from 'lucide-react'
import { convertRelativeDate } from "@/lib/date-utils"
import { IOSpinner } from "./spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface RescheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newDate: string) => void
  currentDate?: string
}

export default function RescheduleDialog({ isOpen, onClose, onConfirm, currentDate }: RescheduleDialogProps) {
  const [dateInput, setDateInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      setDateInput('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!dateInput.trim()) return
    
    setIsLoading(true)
    try {
      const result = await convertRelativeDate(dateInput.trim())
      onConfirm(result.formattedDateTime)
    } catch (error) {
      console.error("Failed to convert date:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && dateInput.trim()) {
      e.preventDefault()
      await handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-[#7c5aff]/20 rounded-[99px] shadow-sm border border-[#7c5aff]/30 justify-center items-center gap-1.5 flex overflow-hidden">
              <RotateCcw className="w-3.5 h-3.5 text-[#7c5aff]" />
            </div>
            <DialogTitle>Reschedule to:</DialogTitle>
          </div>
        </DialogHeader>
          
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="tomorrow, next week, etc."
              className="flex-1 bg-transparent border border-gray-200 dark:border-white/10 rounded-[6px] px-3 h-8 text-foreground text-[13px] font-normal leading-tight placeholder-gray-500 focus:outline-none focus:border-[#7c5aff]/50"
              disabled={isLoading}
            />
            {isLoading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <IOSpinner />
              </div>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!dateInput.trim()}
                weight="medium"
              >
                Set
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 