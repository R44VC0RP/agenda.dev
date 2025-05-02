import { Resend } from 'resend';
import { createElement } from 'react';
import { ReminderEmail } from '@/emails/ReminderEmail';
import { WeeklyReviewEmail } from '@/emails/WeeklyReviewEmail';
import type { ComponentProps, FunctionComponent } from 'react';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'hi@agenda.dev';
const FROM_NAME = 'Agenda';

export type EmailType = 'reminder' | 'weekly-review';

type EmailData = {
  reminder: ComponentProps<typeof ReminderEmail>;
  'weekly-review': ComponentProps<typeof WeeklyReviewEmail>;
};

interface SendEmailOptions<T extends EmailType> {
  to: string;
  subject: string;
  type: T;
  data: EmailData[T];
}

const emailComponents: Record<EmailType, FunctionComponent<any>> = {
  reminder: ReminderEmail,
  'weekly-review': WeeklyReviewEmail,
};

export async function sendEmail<T extends EmailType>({
  to,
  subject,
  type,
  data,
}: SendEmailOptions<T>) {
  try {
    const EmailComponent = emailComponents[type];
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      react: createElement(EmailComponent, data),
    });

    if ('error' in result) {
      console.error('Failed to send email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}
