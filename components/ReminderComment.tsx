import { formatDistanceToNow } from 'date-fns';
import { useSession } from '@/lib/auth-client';

interface ReminderCommentProps {
  text: string;
  createdAt: Date;
}

const parseReminderText = (
  text: string
): {
  summary: string;
  reminderId: string;
  reminderTime: string;
} | null => {
  // Check if this is a reminder comment
  if (!text.startsWith('!!RMD!!')) return null;

  // Split the text by || to get the components
  if (text.startsWith('!!RMD!!') && text.includes('||')) {
    const [summary, reminderId, reminderTime] = text
      .replace('!!RMD!!', '')
      .split('||')
      .map((s) => s.trim());

    return {
      summary,
      reminderId,
      reminderTime,
    };
  }

  return null;
};

export default function ReminderComment({ text }: ReminderCommentProps) {
  const { data: session } = useSession();
  const reminderData = parseReminderText(text);

  // If not a reminder or user is not authenticated, show as regular comment
  if (!reminderData || !session?.user) {
    return (
      <div className="text-[15px] text-gray-700 dark:text-white/80 whitespace-pre-wrap break-words">
        {text}
      </div>
    );
  }

  const reminderTimeUTC = new Date(reminderData.reminderTime);
  const reminderTimeLocal = new Date(reminderTimeUTC.toLocaleString());
  const now = new Date();

  if (reminderTimeLocal < now) {
    return (
      <div>
        <h3 className="text-[12px] font-medium text-[#7c5aff]">Reminder Set</h3>
        <p className="text-[12px] font-medium text-[#7c5aff]">{reminderData.summary}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#7c5aff]/10 dark:bg-[#7c5aff]/20 px-3 py-2 rounded-md">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-medium text-[#7c5aff]">
            Reminder Created
            {/* ({formatDistanceToNow(new Date(reminderData?.reminderTime || ''), { addSuffix: true })}) */}
          </h3>
          <p className="text-[14px] font-medium text-[#7c5aff]">{reminderData.summary}</p>
          <p className="text-[13px] text-[#7c5aff]/70 mt-1">
            {formatDistanceToNow(new Date(reminderData?.reminderTime || ''), { addSuffix: true })}{' '}
            at {reminderTimeLocal.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
