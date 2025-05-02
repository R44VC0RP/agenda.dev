#!/usr/bin/env bun
/**
 * Development script to test the reminder cron endpoint locally
 * Run with: bun dev/test-cron.ts
 */

import { config } from 'dotenv';
config({
  path: '../.env',
});

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is not set');
  process.exit(1);
}

async function checkReminders() {
  try {
    const response = await fetch('http://localhost:3000/api/cron/check-reminders', {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📬 Cron job response:', data);
  } catch (error) {
    console.error('❌ Error running cron job:', error);
  }
}

// Initial check
console.log('🚀 Starting local cron job tester...');
checkReminders();

// Run every minute
setInterval(() => {
  console.log('\n⏰ Running scheduled check...');
  checkReminders();
}, 60 * 1000); // 60 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping cron job tester...');
  process.exit(0);
});
