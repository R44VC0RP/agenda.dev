import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export const metadata = {
  title: 'Terms of Service - agenda.dev',
  description: 'Terms of Service for agenda.dev',
};

export default function TermsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Terms of Service
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6 prose dark:prose-invert prose-sm sm:prose-base max-w-none">
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                By accessing or using agenda.dev, you agree to be bound by these Terms of Service.
                If you do not agree to all the terms and conditions, then you may not access or use
                our services.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                2. Changes to Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We reserve the right to modify these terms at any time. We will always post the most
                current version on our website. By continuing to use the platform after changes
                become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                3. User Accounts
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                When you create an account with us, you must provide accurate, complete, and current
                information. You are responsible for safeguarding your password and for all
                activities that occur under your account.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                4. User Content
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Our service allows you to create and manage todo items. You retain ownership of your
                content, but grant us a license to use, store, and display your content in
                connection with providing the service.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                5. Prohibited Uses
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                You may not use our service for any illegal purposes or to violate any laws. You may
                not access or attempt to access the service by any means other than through the
                interface that we provide.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                6. Termination
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may terminate or suspend your account and access to the service immediately,
                without prior notice, if you breach these Terms of Service.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                In no event shall agenda.dev, its officers, directors, employees, or agents, be
                liable for any indirect, incidental, special, consequential or punitive damages
                arising out of or in connection with your use of the service.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                8. Governing Law
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                These Terms shall be governed by the laws of the jurisdiction in which the company
                is established, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                9. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                If you have any questions about these Terms, please contact us at
                support@agenda.dev.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
