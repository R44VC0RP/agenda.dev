import React from 'react';

export default function TestLinksPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Links Page</h1>
      <p className="mb-2">
        This page contains some text with unescaped entities that&apos;ll trigger ESLint errors.
      </p>
      <p className="mb-2">
        Don&apos;t forget to check if you&apos;re seeing the ESLint
        &apos;react/no-unescaped-entities&apos; error.
      </p>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">User&apos;s Feedback</h2>
        <blockquote className="italic">
          I can&apos;t believe how useful this app is! It&apos;s changed my workflow completely.
        </blockquote>
      </div>
    </div>
  );
}
