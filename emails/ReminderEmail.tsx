import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Font,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { CSSProperties } from 'react';

// Custom type for email styles that includes media queries
type EmailStyle = CSSProperties & {
  '@media (prefersColorScheme: dark)'?: CSSProperties;
};

interface ReminderEmailProps {
  todoTitle: string;
  dueDate: Date;
  urgency: number;
  comments?: string[];
  userTimeZone: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const ReminderEmail: React.FC<ReminderEmailProps> = ({
  todoTitle,
  dueDate,
  urgency,
  comments = [],
  userTimeZone,
}) => {
  const formattedDueDate = dueDate.toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: userTimeZone,
  });

  const urgencyGradient = `linear-gradient(90deg, #7c5aff ${urgency}%, #1a1a1a ${urgency}%)`;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="OpenRunde"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: '/fonts/OpenRunde-Regular.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Task Reminder: {todoTitle}</Preview>
      <Body style={main}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            <Text style={headerStyle}>
              {todoTitle}
            </Text>
            <Text style={dueDateStyle}>Due: {formattedDueDate}</Text>
            
            <div style={urgencyContainer}>
              <Text style={urgencyLabel}>Task Progress</Text>
              <div style={{
                height: '8px',
                borderRadius: '4px',
                background: urgencyGradient,
              }} />
            </div>

            {comments.length > 0 && (
              <div style={commentsSection}>
                <Text style={commentsSectionTitle}>
                  Recent Comments
                </Text>
                {comments.map((comment, index) => (
                  <Text key={index} style={commentStyle}>
                    {comment}
                  </Text>
                ))}
              </div>
            )}

            <div style={buttonContainer}>
              <Link href={baseUrl} style={buttonStyle}>
                View Task
              </Link>
            </div>
          </Section>

          <Text style={footerText}>
            This reminder was sent from your Agenda.dev todo list
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Updated styles with dark mode support using EmailStyle type
const main: EmailStyle = {
  backgroundColor: '#f6f6f7',
  fontFamily: "'OpenRunde', Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
  '@media (prefersColorScheme: dark)': {
    backgroundColor: '#131316',
  },
};

const containerStyle: EmailStyle = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '100%',
  maxWidth: '600px',
};

const cardStyle: EmailStyle = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  '@media (prefersColorScheme: dark)': {
    background: '#1a1a1a',
    boxShadow: '0px 32px 64px -16px rgba(0,0,0,0.30), 0px 16px 32px -8px rgba(0,0,0,0.30), 0px 8px 16px -4px rgba(0,0,0,0.24), 0px 4px 8px -2px rgba(0,0,0,0.24), 0px -8px 16px -1px rgba(0,0,0,0.16), 0px 2px 4px -1px rgba(0,0,0,0.24), 0px 0px 0px 1px rgba(0,0,0,1.00), inset 0px 0px 0px 1px rgba(255,255,255,0.08), inset 0px 1px 0px 0px rgba(255,255,255,0.20)',
  },
};

const headerStyle: EmailStyle = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 24px',
  textAlign: 'center',
  '@media (prefersColorScheme: dark)': {
    color: '#ffffff',
  },
};

const dueDateStyle: EmailStyle = {
  color: '#4b5563',
  fontSize: '16px',
  marginBottom: '16px',
  textAlign: 'center',
  '@media (prefersColorScheme: dark)': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
};

const urgencyContainer: EmailStyle = {
  margin: '24px 0',
};

const urgencyLabel: EmailStyle = {
  color: '#4b5563',
  fontSize: '14px',
  marginBottom: '8px',
  '@media (prefersColorScheme: dark)': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
};

const commentsSection: EmailStyle = {
  marginTop: '24px',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '24px',
  '@media (prefersColorScheme: dark)': {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

const commentsSectionTitle: EmailStyle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0 0 16px',
  '@media (prefersColorScheme: dark)': {
    color: '#ffffff',
  },
};

const commentStyle: EmailStyle = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0 0 12px',
  lineHeight: '20px',
  '@media (prefersColorScheme: dark)': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
};

const buttonContainer: EmailStyle = {
  textAlign: 'center',
  marginTop: '32px',
};

const buttonStyle: EmailStyle = {
  display: 'inline-block',
  padding: '12px 24px',
  background: 'linear-gradient(180deg, #7c5aff 0%, #6c47ff 100%)',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,0.16), 0px 1px 2px 0px rgba(0,0,0,0.20)',
  WebkitTextSizeAdjust: 'none',
  '@media (prefersColorScheme: dark)': {
    boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,0.16), 0px 1px 2px 0px rgba(0,0,0,0.40)',
  },
};

const footerText: EmailStyle = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center',
  marginTop: '24px',
  '@media (prefersColorScheme: dark)': {
    color: 'rgba(255, 255, 255, 0.5)',
  },
};

export default ReminderEmail; 