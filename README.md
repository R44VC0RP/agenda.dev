# Todo Exon - The World's Fastest Todo App

A blazingly fast, feature-rich todo application built with Next.js 13+, React, and TypeScript. Features real-time updates, masonry layout, and a beautiful dark mode.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/exon-enterprise/simple-todo)

## Features

- ⚡️ Blazing fast performance with Next.js 13+ and React
- 🎨 Beautiful UI with dark mode support
- 📱 Fully responsive masonry layout
- 💾 Local storage sync
- 🔄 Real-time updates
- 🎯 PostHog analytics integration
- 💬 Comment system
- 🔒 Google authentication
- 📊 Featurebase feedback integration

## Tech Stack

- **Framework:** Next.js 15+
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** NextAuth.js
- **Analytics:** PostHog
- **Deployment:** Vercel
- **Package Manager:** Bun

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database
- Google OAuth credentials (for authentication)
- PostHog account (for analytics)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/R44VC0RP/todo-exon.git
   cd todo-exon
   ```

2. Install dependencies:

   ```bash
   bun install
   # or
   npm install
   ```

3. Copy the example environment variables:

   ```bash
   cp .env.example .env
   ```

4. Update the environment variables in `.env` with your values

5. Run the development server:

   ```bash
   bun dev
   # or
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
todo-exon/
├── app/              # Next.js 13+ app directory
├── components/       # React components
├── lib/             # Utility functions and types
├── hooks/           # Custom React hooks
├── public/          # Static assets
├── styles/          # Global styles
└── types/           # TypeScript type definitions
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests and linting: `bun test`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [v0.dev](https://v0.dev)
- Deployed on [Vercel](https://vercel.com)
- Analytics by [PostHog](https://posthog.com)
- Feedback by [Featurebase](https://featurebase.app)
