import React from 'react';
import { LegalLayout } from '../components/LegalLayout';

export const TermsOfUse: React.FC = () => {
    return (
        <LegalLayout title="Terms of Use">
            <p className="update-date">Last Updated: February 26, 2026</p>

            <section>
                <p>
                    Welcome to the Strata Reserve Planning Information Report Portal. By accessing or using our
                    Portal, you agree to be bound by these Terms of Use.
                </p>
            </section>

            <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                    These Terms of Use constitute a legally binding agreement between you and Strata Reserve Planning.
                    If you do not agree to these terms, you must not access or use the Portal.
                </p>
            </section>

            <section>
                <h2>2. Authorized Use</h2>
                <p>
                    The Portal is intended for use by strata property managers, strata council members, and authorized
                    inspectors. You agree to use the Portal only for its intended purposes related to the
                    Depreciation Report process.
                </p>
            </section>

            <section>
                <h2>3. User Responsibilities</h2>
                <p>You are responsible for:</p>
                <ul>
                    <li>Maintaining the confidentiality of your account credentials.</li>
                    <li>Ensuring that all information you provide is accurate and up to date.</li>
                    <li>The legality and accuracy of any documents you upload to the Portal.</li>
                    <li>Complying with all applicable laws and regulations.</li>
                </ul>
            </section>

            <section>
                <h2>4. Intellectual Property</h2>
                <p>
                    All content, features, and functionality on the Portal, including text, graphics, logos, and
                    software, are the exclusive property of Strata Reserve Planning or its licensors and are
                    protected by copyright and other intellectual property laws.
                </p>
            </section>

            <section>
                <h2>5. Limitation of Liability</h2>
                <p>
                    To the maximum extent permitted by law, Strata Reserve Planning shall not be liable for any
                    indirect, incidental, special, or consequential damages arising out of or in connection with
                    your use of the Portal.
                </p>
            </section>

            <section>
                <h2>6. Termination</h2>
                <p>
                    We reserve the right to terminate or suspend your access to the Portal at our sole discretion,
                    without notice, for conduct that we believe violates these Terms of Use or is harmful to
                    other users or our business interests.
                </p>
            </section>

            <section>
                <h2>7. Governing Law</h2>
                <p>
                    These Terms of Use shall be governed by and construed in accordance with the laws of the
                    Province of British Columbia, Canada.
                </p>
            </section>
        </LegalLayout>
    );
};
