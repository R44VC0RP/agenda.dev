import React from 'react';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
};

const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline"
    >
      {children}
    </a>
  );
};

/**
 * Renders a test page showcasing external links, styled text, and a customer review section.
 *
 * Includes headings, paragraphs with escaped apostrophes, a styled review quote, and two external links for demonstration purposes.
 */
export default function TestExternalLinks() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">External Links Test</h1>
      <p>
        Here&apos;s a component that&apos;ll trigger ESLint errors due to unescaped apostrophes.
      </p>
      <p>Don&apos;t forget to check our company&apos;s website for more information.</p>
      <div className="p-4 border rounded">
        <h2 className="text-lg font-semibold">Customer&apos;s Review</h2>
        <p className="italic mt-2">
          &quot;This product isn&apos;t just good, it&apos;s amazing! I can&apos;t recommend it
          enough.&quot;
        </p>
      </div>
      <div className="flex space-x-4">
        <ExternalLink href="https://example.com">Example Link</ExternalLink>
        <ExternalLink href="https://github.com">GitHub</ExternalLink>
      </div>
    </div>
  );
}
