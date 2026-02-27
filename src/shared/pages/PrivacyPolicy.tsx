import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export const PrivacyPolicy: React.FC = () => {
    return (
        <LegalLayout title="Privacy Policy">
            <p className="update-date">Last Updated: February 26, 2026</p>

            <section>
                <p>
                    At Strata Reserve Planning (SRP), we are committed to protecting your privacy. This Privacy Policy
                    describes how we collect, use, and disclose information through our Information Report Portal.
                </p>
            </section>

            <section>
                <h2>1. Information We Collect</h2>
                <p>We collect information you provide directly to us when you use the Portal, including:</p>
                <ul>
                    <li><strong>Account Information:</strong> Name, email address, password, and contact details.</li>
                    <li><strong>Strata Data:</strong> Information related to strata complexes, including addresses, plans, and financial documents.</li>
                    <li><strong>Communication:</strong> When you contact our support team or email client care.</li>
                </ul>
            </section>

            <section>
                <h2>2. How We Use Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                    <li>Provide, maintain, and improve the Information Report Portal.</li>
                    <li>Generate professional depreciation reports and technical assessments.</li>
                    <li>Communicate with you about your account and technical support.</li>
                    <li>Monitor and analyze usage trends and activities.</li>
                </ul>
            </section>

            <section>
                <h2>3. Information Sharing</h2>
                <p>
                    We do not share your personal information with third parties except as described in this policy.
                    We may share information with service providers who perform services on our behalf, such as
                    hosting providers and technical consultants, but only to the extent necessary to provide the Portal.
                </p>
            </section>

            <section>
                <h2>4. Data Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect the security of your
                    strata documents and personal information. This includes encryption of sensitive data and
                    regular security audits.
                </p>
            </section>

            <section>
                <h2>5. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at:
                    <br />
                    <strong>Email:</strong> clientcare@stratareserveplanning.com
                </p>
            </section>
        </LegalLayout>
    );
};
