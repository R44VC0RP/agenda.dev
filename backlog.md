[ ] PWA via https://nextjs.org/docs/app/guides/progressive-web-apps
[ ] Weekly Review Email and Notification (takes all todos that have been completed into an AI and then it generates a weekly review)
[x] !remindme command inline of a comment that will be in this format: !remindme 1d, 1w, 1m, 1y (or if nothing is provided then it will default to 1hr (this needs to be configurable in the settings)) and a message and that will send an email saying hey! here is your reminder for this comment on this todo with this chain of comments.

### !remindme Feature Breakdown:

1. Database Schema:
   [x] Create reminders table with required fields (id, userId, todoId, title, description, reminderTime, message, summary, status, createdAt, updatedAt)

2. Comment Box Enhancement:
   [x] Add detection for "!rmd" or "!remindme" triggers
   [x] Implement visual glow effect on trigger detection -> using https://magicui.design/docs/components/shine-border
   [x] Parse natural language time input using AI -> integrated directly in /api/reminders with GPT-4.1-nano

3. API Routes:
   [x] Create /api/reminders endpoint with action-based JSON body (create, list, mark-complete)
   [x] Implement AI-powered reminder generation with title, description, and summary
   [x] Integrate natural language time parsing with the same AI model
   [x] Add proper error handling and validation for AI responses

4. Email Service:
   [ ] Set up email template for notifications -> react email template (should match the design of the app)
   [ ] Implement background job for reminder checking -> vercel cron job (need to modify vercel.json)
   [ ] Configure email sending service -> using resend -> email.ts

Cleanup

- Only make this feature available for users who are logged in (we will limit it to 20 reminders per month)
- Users who are not logged in should not be able to see the reminders or use the !remindme command

### Recent Updates:

- Enhanced reminder creation with AI-generated structured content (title, description, time, summary)
- Integrated natural language time parsing directly in the reminders API
- Added proper validation for AI responses
- Updated database schema to store more detailed reminder information
- Improved error handling and user feedback in the comment system
