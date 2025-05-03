# Todo Exon - The Modern Todo App

A feature-rich todo application with web and desktop support built with Next.js, React, TypeScript, and Tauri.

[![Desktop App](https://img.shields.io/badge/Desktop-Tauri-blue?style=for-the-badge&logo=tauri)](https://tauri.app)
[![Web App](https://img.shields.io/badge/Web-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

## Features

- ⚡️ **Cross-Platform**: Web and desktop apps with Tauri (macOS, Windows, Linux)
- 🔄 **Workspaces**: Organize todos in personal and shared workspaces
- 🔔 **Reminders**: Get notified about your todos via email
- 💬 **Comments**: Add context to your todos with comments
- 🌙 **Dark Mode**: Toggle between dark and light themes
- 🔐 **Authentication**: Secure login with Google, GitHub, and Twitter
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🤖 **AI-Powered**: Natural language todo creation
- 📊 **Weekly Reviews**: Receive email summaries of your todos
- ⌨️ **Command Palette**: Quick access to application features
- 🌐 **Timezone Support**: Handle todos across different timezones
- ⚡️ **Raycast Extension**: Quick access to todos from Raycast

## Tech Stack

- **Frontend**: React, Next.js 15+, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Desktop**: Tauri (Rust)
- **Authentication**: Next Auth with OAuth providers
- **UI Components**: Shadcn UI with Radix UI primitives
- **Email**: Resend for email notifications
- **Analytics**: PostHog

## Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/) (for desktop app development)
- PostgreSQL database

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/R44VC0RP/todo-exon.git
   cd todo-exon
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables (database URL, OAuth credentials, etc.)

4. Run the development server:

   ```bash
   bun run dev
   ```

5. For desktop app development:
   ```bash
   bun run tauri:dev
   ```

### Database

The application uses Drizzle ORM for database operations.

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:push
```

## Building

### Web Application

```bash
bun run build
```

### Desktop Application

```bash
bun run tauri:build
```

## Project Structure

```
todo-exon/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/              # Utility functions and database
├── emails/           # Email templates
├── public/           # Static assets
├── styles/           # Global styles
├── raycast-extension/# Raycast extension
└── src-tauri/        # Tauri desktop app
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request
