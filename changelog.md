# Changelog

## [Unreleased]

### Added

- Keyboard shortcuts (Ctrl+Cmd+[1-9]) for quick workspace switching
- Visual indicators in workspace switcher showing keyboard shortcuts
- AI-powered reminder system:
  - Support for !remindme and !rmd commands in comments
  - Natural language time parsing (e.g., "tomorrow at 9am", "in 2 hours")
  - Smart reminder generation with context-aware titles and descriptions
  - Visual feedback with glowing border when typing reminder commands
  - Automatic summary generation for reminder confirmations
- Comprehensive email reminder system:
  - Timezone-aware reminder scheduling with automatic browser timezone detection
  - Email notifications using React Email templates and Resend
  - Vercel cron job for automated reminder checking and sending
  - User-configurable reminder settings in preferences
  - Beautiful, responsive email templates with consistent branding
  - Support for reminder management (view, cancel, track status)
- Legal pages:
  - Terms of Service page with standard legal information
  - Privacy Policy page outlining data collection and usage practices
  - Links in settings dialog and footer for easy access

### Changed

- Improved Settings dialog UI:
  - Made dialog layout more compact and consistent
  - Aligned all controls to the right side
  - Improved spacing and visual hierarchy
  - Enhanced readability of settings options
- Enhanced database schema for reminders with additional fields for better organization
- Improved error handling and validation in reminder creation process
- Optimized workspace switching to prevent unnecessary state updates when switching to current workspace

### Technical

- Integrated GPT-4.1-nano model for natural language processing
- Implemented structured AI response parsing with validation
- Consolidated time parsing logic within reminders API for better efficiency
- Added Resend email service integration
- Implemented Vercel cron jobs for automated reminder processing
- Created timezone utility functions for consistent date/time handling
- Enhanced database schema with timezone support
- Added email templates using @react-email/components

## 2023-10-29

- Added timezone support
- Improved UI for reminders
- Bug fixes in todo sorting algorithm

## 2023-10-30

- Added multi-provider authentication (Google, GitHub, Twitter)
- Implemented account linking capabilities
- Created dedicated account management UI in settings
