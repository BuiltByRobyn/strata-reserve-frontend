import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export const HelpContent: React.FC = () => (
  <>
    <section>
        <h2>Documentation Guides</h2>
        <p>Download the guides below to help you get started.</p>
        <ul className="help-downloads">
          <li>
            <a href="/docs/getting-started-guide.pdf" download>Getting Started Guide</a>
          </li>
          <li>
            <a href="/docs/client-user-manual.pdf" download>Client User Manual</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Need Further Assistance?</h2>
        <p>
          If you need additional help, please contact our support team at{' '}
          <a href="mailto:clientcare@stratareserveplanning.com">
            clientcare@stratareserveplanning.com
          </a>
        </p>
      </section>
  </>
);

export const Help: React.FC = () => (
  <LegalLayout title="Help & Documentation">
    <HelpContent />
  </LegalLayout>
);
