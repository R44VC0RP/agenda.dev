import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

interface WeeklyReviewEmailProps {
  userName: string;
  completedTodos: number;
  pendingTodos: number;
  productivityScore: number;
  topCategory?: string;
}

export const WeeklyReviewEmail: React.FC<WeeklyReviewEmailProps> = ({
  userName,
  completedTodos,
  pendingTodos,
  productivityScore,
  topCategory,
}) => {
  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Your Weekly Todo Review</Text>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Here's your productivity summary for the past week:
            </Text>
            
            <Section style={statsContainer}>
              <Text style={statItem}>
                ✅ Completed Todos: {completedTodos}
              </Text>
              <Text style={statItem}>
                ⏳ Pending Todos: {pendingTodos}
              </Text>
              <Text style={statItem}>
                🎯 Productivity Score: {productivityScore}%
              </Text>
              {topCategory && (
                <Text style={statItem}>
                  🏆 Most Active Category: {topCategory}
                </Text>
              )}
            </Section>

            <Button
              href="https://agenda.dev/analytics"
              style={button}
            >
              View Full Analytics
            </Button>

            <Hr style={hr} />
            
            <Text style={footer}>
              Sent by Agenda - Your Supercharged Todo List
              <br />
              <Link href="https://agenda.dev/settings" style={unsubscribeLink}>
                Update email preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '16px 0',
  color: '#484848',
  fontFamily: '"OpenRunde", sans-serif',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  margin: '16px 0',
  fontFamily: '"OpenRunde", sans-serif',
};

const statsContainer = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const statItem = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  margin: '8px 0',
  fontFamily: '"OpenRunde", sans-serif',
  fontWeight: '500',
};

const button = {
  backgroundColor: '#5046e4',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
  margin: '24px 0',
  fontFamily: '"OpenRunde", sans-serif',
  fontWeight: '500',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#9BA2B0',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
  fontFamily: '"OpenRunde", sans-serif',
};

const unsubscribeLink = {
  color: '#9BA2B0',
  textDecoration: 'underline',
  fontSize: '14px',
  fontFamily: '"OpenRunde", sans-serif',
}; 