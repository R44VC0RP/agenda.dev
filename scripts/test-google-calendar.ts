import { hasGoogleCalendarAccess, getCalendarEvents } from '../lib/google-calendar';

const TEST_USER_ID = '63ozPMlYIjHsO7Saljf4Kytd5RXpzqbi';

async function runTests() {
  console.log('🧪 Starting Google Calendar Integration Tests\n');

  // Test 1: Check if user has Google Calendar access
  console.log('Test 1: Checking Google Calendar Access');
  try {
    const access = await hasGoogleCalendarAccess(TEST_USER_ID);
    console.log('Google Calendar Access Status:', access.hasAccess);
    console.log('Access Details:', JSON.stringify(access.details, null, 2));
  } catch (error) {
    console.error('❌ Error checking calendar access:', error);
  }
  console.log('-------------------\n');

  // Test 2: Get Today's Events
  console.log('Test 2: Getting Today\'s Events');
  try {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    console.log('Fetching events between:', now.toISOString(), 'and', endOfDay.toISOString());
    const todayEvents = await getCalendarEvents(TEST_USER_ID, now, endOfDay);
    console.log('Today\'s Events:', JSON.stringify(todayEvents, null, 2));
  } catch (error) {
    console.error('❌ Error getting today\'s events:', error);
  }
  console.log('-------------------\n');

  // Test 3: Get Next Week's Events
  console.log('Test 3: Getting Next Week\'s Events');
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    console.log('Fetching events between:', now.toISOString(), 'and', nextWeek.toISOString());
    const weekEvents = await getCalendarEvents(TEST_USER_ID, now, nextWeek, 20);
    console.log('Next Week\'s Events:', JSON.stringify(weekEvents, null, 2));
  } catch (error) {
    console.error('❌ Error getting next week\'s events:', error);
  }
  console.log('-------------------\n');

  // Test 4: Get Next Month's Events
  console.log('Test 4: Getting Next Month\'s Events');
  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    console.log('Fetching events between:', now.toISOString(), 'and', nextMonth.toISOString());
    const monthEvents = await getCalendarEvents(TEST_USER_ID, now, nextMonth, 30);
    console.log('Next Month\'s Events:', JSON.stringify(monthEvents, null, 2));
  } catch (error) {
    console.error('❌ Error getting next month\'s events:', error);
  }
  console.log('-------------------\n');

  console.log('🏁 Tests Completed');
}

// Run the tests
runTests().catch(console.error); 