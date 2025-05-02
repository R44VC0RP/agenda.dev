import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export const metadata = {
  title: 'Privacy Policy - agenda.dev',
  description: 'Privacy Policy for agenda.dev',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <FaArrowLeft className="mr-2" />
            Back to Agenda
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6 prose dark:prose-invert prose-sm sm:prose-base max-w-none">
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                1. Introduction
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                This Privacy Policy explains how agenda.dev collects, uses, and discloses
                information about you when you use our services. We respect your privacy and are
                committed to protecting your personal data.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                2. Information We Collect
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We collect information you provide directly to us, such as:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                <li>Account information (name, email address, password)</li>
                <li>Profile information (profile picture, bio)</li>
                <li>Content you create (todos, comments, workspaces)</li>
                <li>Communications you send to us</li>
              </ul>
              <p className="mt-3 text-gray-700 dark:text-gray-300">
                We also collect information automatically when you use our services, including:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                <li>Usage information (features you use, actions you take)</li>
                <li>Device information (browser type, operating system, IP address)</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                <li>Provide, maintain, and improve our services</li>
                <li>Create and manage your account</li>
                <li>Process transactions</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Develop new products and services</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Protect against fraud and abuse</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                4. How We Share Your Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may share information about you in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                <li>With other users when you choose to share content</li>
                <li>With service providers who perform services on our behalf</li>
                <li>To comply with legal obligations</li>
                <li>In connection with a merger, sale, or acquisition</li>
                <li>With your consent or at your direction</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                5. Data Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We implement appropriate technical and organizational measures to protect your
                personal data against unauthorized or unlawful processing, accidental loss,
                destruction, or damage.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                6. Your Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Depending on your location, you may have certain rights regarding your personal
                information, such as the right to access, correct, delete, or restrict the
                processing of your data.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                7. Changes to This Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new policy on this page and updating the effective date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                8. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                If you have any questions about this Privacy Policy, please contact us at
                privacy@agenda.dev.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
