import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout } from '../components/LegalLayout';

export const PrivacyPolicy: React.FC = () => {
    return (
        <LegalLayout title="Privacy Policy">
            <p className="update-date">Last Updated: February 26, 2026</p>

            <section>
                <p>
                    Strata Reserve Planning ("SRP", "we", "us", or "our") is committed to protecting
                    the privacy and security of your personal information. This Privacy Policy describes
                    how we collect, use, disclose, and safeguard information through our Information
                    Report Portal (the "Portal").
                </p>
                <p>
                    SRP operates under the laws of British Columbia, Canada. This Privacy Policy is
                    designed to comply with the <em>Personal Information Protection and Electronic
                    Documents Act</em> (PIPEDA) and British Columbia's <em>Personal Information
                    Protection Act</em> (PIPA).
                </p>
                <p>
                    By accessing or using the Portal, you acknowledge that you have read, understood,
                    and agree to the collection, use, and disclosure of your information as described
                    in this Privacy Policy. This Privacy Policy should be read in conjunction with
                    our <Link to="/terms">Terms of Use</Link>.
                </p>
            </section>

            <section>
                <h2>1. Definitions</h2>
                <ul>
                    <li>
                        <strong>"Personal Information"</strong> means information about an identifiable
                        individual, as defined under PIPEDA and BC PIPA, excluding business contact
                        information used solely for business communications.
                    </li>
                    <li>
                        <strong>"Portal"</strong> means the SRP Information Report Portal web application
                        and all associated services.
                    </li>
                    <li>
                        <strong>"Services"</strong> means the depreciation report management, inspection
                        scheduling, document management, survey administration, and related services
                        provided through the Portal.
                    </li>
                    <li>
                        <strong>"User", "you", or "your"</strong> means any individual accessing the
                        Portal, including strata property managers, strata council members, authorized
                        inspectors, and administrators.
                    </li>
                    <li>
                        <strong>"Strata Data"</strong> means information related to strata corporations,
                        including property details, financial documents, survey responses, and related
                        records managed through the Portal.
                    </li>
                </ul>
            </section>

            <section>
                <h2>2. Information We Collect</h2>
                <p>
                    We collect information in several categories depending on your use of the Portal.
                    The types of information we collect include:
                </p>

                <h3>2.1 Personal Information You Provide Directly</h3>
                <ul>
                    <li>Full name (first name and last name)</li>
                    <li>Email address</li>
                    <li>Telephone number(s)</li>
                    <li>Company name and professional affiliation</li>
                    <li>Role or position within a strata corporation (e.g., property manager, council member)</li>
                    <li>Account credentials (email and password, managed through our authentication provider)</li>
                </ul>

                <h3>2.2 Strata Property Information</h3>
                <ul>
                    <li>Strata plan numbers and complex names</li>
                    <li>Property addresses (including unit number, street address, city, province, and postal code)</li>
                    <li>Legal type classifications and property type classifications</li>
                    <li>Fiscal year end dates</li>
                    <li>Management company associations</li>
                </ul>

                <h3>2.3 Strata Member Information</h3>
                <ul>
                    <li>Names and positions of strata council members and employees</li>
                    <li>Contact information for strata members (email addresses and phone numbers)</li>
                </ul>

                <h3>2.4 Survey and Assessment Data</h3>
                <ul>
                    <li>Text responses to assessment questions</li>
                    <li>Date, numerical, and yes/no responses</li>
                    <li>Multiple choice selections</li>
                    <li>Responses across assessment categories including Exterior, Interior, Services,
                        Clubhouse, Amenity Room, Legal, and Council Concerns</li>
                </ul>

                <h3>2.5 Documents and Files</h3>
                <ul>
                    <li>Financial documents, insurance certificates, and engineering reports</li>
                    <li>Other strata-related documents uploaded in PDF, JPEG, DOC, or DOCX format</li>
                    <li>Document metadata including file name, file size, upload date, document type, and any notes provided</li>
                </ul>

                <h3>2.6 File Number and Appointment Information</h3>
                <ul>
                    <li>Service request details and status information</li>
                    <li>Appointment dates, times, and scheduling preferences</li>
                    <li>Inspector availability and assignment data</li>
                    <li>Special requirements and completion notes</li>
                </ul>

                <h3>2.7 Timeline and Reporting Data</h3>
                <ul>
                    <li>Annual General Meeting (AGM) dates</li>
                    <li>Depreciation report dates and target dates</li>
                    <li>Fiscal year information</li>
                </ul>

                <h3>2.8 Automatically Collected Information</h3>
                <p>When you access the Portal, we may automatically collect:</p>
                <ul>
                    <li>Browser type and version</li>
                    <li>Internet Protocol (IP) address</li>
                    <li>Pages visited within the Portal and navigation patterns</li>
                    <li>Date, time, and duration of access</li>
                    <li>Referring URLs</li>
                    <li>Device type and operating system information</li>
                </ul>
            </section>

            <section>
                <h2>3. How We Use Your Information</h2>
                <p>We use the information we collect for the following purposes:</p>
                <ul>
                    <li>Providing, operating, and maintaining the Information Report Portal</li>
                    <li>Creating and managing user accounts and authenticating access</li>
                    <li>Generating and managing depreciation reports and technical assessments</li>
                    <li>Facilitating inspection scheduling and appointment management</li>
                    <li>Processing, storing, and organizing strata property documentation</li>
                    <li>Administering survey questionnaires and collecting assessment data</li>
                    <li>Communicating with you regarding your account, file numbers, and technical support</li>
                    <li>Managing strata property profiles and member associations</li>
                    <li>Tracking file number status, timelines, and project milestones</li>
                    <li>Monitoring and analyzing usage trends to improve Portal functionality and user experience</li>
                    <li>Ensuring the security, integrity, and proper functioning of the Portal</li>
                    <li>Complying with legal obligations under the <em>Strata Property Act</em> (BC), PIPEDA, BC PIPA, and other applicable legislation</li>
                    <li>Responding to user inquiries and providing customer support</li>
                </ul>
            </section>

            <section>
                <h2>4. Legal Basis for Processing</h2>
                <p>
                    Under PIPEDA and BC PIPA, we process your personal information on the following
                    legal grounds:
                </p>
                <ul>
                    <li>
                        <strong>Consent:</strong> We obtain your consent at the time of account creation
                        and through your ongoing use of the Portal. Under BC PIPA, consent may be express
                        or implied depending on the sensitivity of the information and the reasonable
                        expectations of the individual.
                    </li>
                    <li>
                        <strong>Contractual Necessity:</strong> Processing is necessary to deliver the
                        Portal services you or your strata corporation have requested.
                    </li>
                    <li>
                        <strong>Legitimate Interest:</strong> We may process information to improve
                        Portal functionality, monitor security, and prevent fraud, where such processing
                        does not override your privacy rights.
                    </li>
                    <li>
                        <strong>Legal Obligation:</strong> We may process information to comply with
                        the <em>Strata Property Act</em> (BC), PIPEDA, BC PIPA, and other applicable
                        laws and regulations.
                    </li>
                </ul>
            </section>

            <section>
                <h2>5. Information Sharing and Disclosure</h2>
                <p>
                    We do not sell, rent, or trade your personal information to third parties for
                    marketing or advertising purposes. We may share your information in the following
                    circumstances:
                </p>
                <ul>
                    <li>
                        <strong>Within Your Strata Corporation:</strong> Information may be shared with
                        other authorized members of your strata corporation as necessary for the
                        management and completion of depreciation reports and related services.
                    </li>
                    <li>
                        <strong>Service Providers:</strong> We engage third-party service providers who
                        assist in operating the Portal, including cloud hosting and authentication
                        infrastructure providers. These providers are contractually bound to protect
                        your information and may only use it to provide services on our behalf.
                    </li>
                    <li>
                        <strong>Authorized Inspectors:</strong> Inspectors authorized by SRP may access
                        strata property data and appointment information necessary for conducting
                        property assessments.
                    </li>
                    <li>
                        <strong>Legal Requirements:</strong> We may disclose information where required
                        by law, regulation, legal process, or enforceable governmental request.
                    </li>
                    <li>
                        <strong>Protection of Rights:</strong> We may disclose information where
                        necessary to protect the rights, property, or safety of SRP, our users, or
                        the public.
                    </li>
                    <li>
                        <strong>Business Transfers:</strong> In connection with a merger, acquisition,
                        reorganization, or sale of assets, your information may be transferred as part
                        of the transaction. We will notify affected users of any such transfer and any
                        changes to this Privacy Policy.
                    </li>
                </ul>
            </section>

            <section>
                <h2>6. Data Storage and Cross-Border Transfers</h2>
                <p>
                    Your information is stored using secure cloud infrastructure provided by our
                    third-party hosting provider. Servers used to store your data may be located
                    outside of Canada, including in the United States.
                </p>
                <p>
                    When your information is transferred outside of Canada, it may be subject to the
                    laws of the jurisdiction in which it is stored. In accordance with PIPEDA Principle
                    4.1.3, SRP remains accountable for personal information transferred to third-party
                    service providers. We ensure that contractual safeguards are in place requiring
                    service providers to protect your information to a standard comparable to Canadian
                    privacy law.
                </p>
            </section>

            <section>
                <h2>7. Data Retention</h2>
                <p>
                    We retain your personal information only for as long as necessary to fulfill the
                    purposes for which it was collected, or as required by law. Our retention practices
                    include:
                </p>
                <ul>
                    <li>
                        <strong>Account Information:</strong> Retained for the duration of your active
                        account and for a reasonable period following account closure to address any
                        outstanding inquiries or obligations.
                    </li>
                    <li>
                        <strong>Strata Property Data and Documents:</strong> Retained for the duration
                        of the business relationship and for a minimum of seven (7) years thereafter,
                        consistent with Canadian business record retention requirements and obligations
                        under the <em>Strata Property Act</em>.
                    </li>
                    <li>
                        <strong>Survey Responses and Assessment Data:</strong> Retained as part of the
                        depreciation report lifecycle and associated record-keeping requirements.
                    </li>
                    <li>
                        <strong>File Number Records:</strong> Retained for record-keeping, audit,
                        and compliance purposes.
                    </li>
                    <li>
                        <strong>Automatically Collected Usage Data:</strong> Retained for up to twelve
                        (12) months for analytics and security monitoring purposes.
                    </li>
                </ul>
                <p>
                    Upon a verified request for account deletion, we will delete or anonymize your
                    personal information within a reasonable timeframe, subject to any legal or
                    regulatory retention obligations.
                </p>
            </section>

            <section>
                <h2>8. Data Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect the
                    security of your personal information and strata documents. These measures include:
                </p>
                <ul>
                    <li>Encryption of data in transit using TLS/SSL protocols</li>
                    <li>Encryption of sensitive data at rest</li>
                    <li>Secure authentication with industry-standard password hashing</li>
                    <li>Role-based access controls restricting data access to authorized users based on their role (administrator, client, inspector)</li>
                    <li>Secure document storage with access controls</li>
                    <li>Session management with automatic timeouts for inactive sessions</li>
                    <li>Regular security monitoring and review of access logs</li>
                </ul>
                <p>
                    While we take reasonable precautions to protect your information, no method of
                    electronic transmission or storage is completely secure. We cannot guarantee the
                    absolute security of your information, and any transmission is at your own risk.
                </p>
            </section>

            <section>
                <h2>9. Your Privacy Rights</h2>
                <p>
                    Under PIPEDA and BC PIPA, you have the following rights with respect to your
                    personal information:
                </p>
                <ul>
                    <li>
                        <strong>Right of Access:</strong> You may request access to the personal
                        information we hold about you and receive an account of how it has been used
                        and disclosed.
                    </li>
                    <li>
                        <strong>Right to Correction:</strong> You may request that we correct any
                        inaccurate or incomplete personal information in our records.
                    </li>
                    <li>
                        <strong>Right to Withdrawal of Consent:</strong> You may withdraw your consent
                        for the collection, use, or disclosure of your personal information at any
                        time, subject to legal or contractual restrictions. Please note that withdrawing
                        consent may affect our ability to provide you with access to the Portal and
                        its Services.
                    </li>
                    <li>
                        <strong>Right to Deletion:</strong> You may request that we delete your personal
                        information, subject to applicable legal retention obligations.
                    </li>
                    <li>
                        <strong>Right to Complain:</strong> If you believe your privacy rights have
                        been violated, you have the right to file a complaint with the Office of the
                        Privacy Commissioner of Canada (OPC) at{' '}
                        <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">www.priv.gc.ca</a>{' '}
                        or the British Columbia Office of the Information and Privacy Commissioner
                        (OIPC) at{' '}
                        <a href="https://www.oipc.bc.ca" target="_blank" rel="noopener noreferrer">www.oipc.bc.ca</a>.
                    </li>
                </ul>
                <p>
                    To exercise any of these rights, please contact our Privacy Officer using the
                    contact information provided in Section 13 below. We will respond to your request
                    within thirty (30) days, as required by PIPEDA.
                </p>
            </section>

            <section>
                <h2>10. Cookies and Tracking Technologies</h2>
                <p>
                    The Portal uses cookies and similar technologies to support essential functionality,
                    including session management and user authentication. The types of cookies we use
                    include:
                </p>
                <ul>
                    <li>
                        <strong>Essential Cookies:</strong> Required for the Portal to function properly,
                        including authentication tokens and session identifiers. These cookies are
                        necessary and cannot be disabled without affecting Portal functionality.
                    </li>
                    <li>
                        <strong>Functional Cookies:</strong> Used to remember your preferences and
                        settings within the Portal.
                    </li>
                </ul>
                <p>
                    We do not use third-party advertising or behavioral tracking cookies. You may
                    manage cookies through your browser settings; however, disabling essential cookies
                    may prevent you from using the Portal.
                </p>
            </section>

            <section>
                <h2>11. Children's Privacy</h2>
                <p>
                    The Portal is not intended for use by individuals under the age of nineteen (19),
                    the age of majority in British Columbia. We do not knowingly collect personal
                    information from children or minors. If we become aware that we have inadvertently
                    collected personal information from an individual under the age of 19, we will
                    take steps to delete such information promptly.
                </p>
            </section>

            <section>
                <h2>12. Changes to This Privacy Policy</h2>
                <p>
                    We reserve the right to update or modify this Privacy Policy at any time. If we
                    make material changes, we will notify you by email or by posting a prominent notice
                    on the Portal prior to the changes taking effect. The "Last Updated" date at the
                    top of this Privacy Policy will be revised accordingly.
                </p>
                <p>
                    Your continued use of the Portal following the posting of changes constitutes
                    your acceptance of those changes. If you do not agree with a revised Privacy
                    Policy, you should discontinue use of the Portal and contact us to request
                    deletion of your account.
                </p>
            </section>

            <section>
                <h2>13. Contact Us &mdash; Privacy Officer</h2>
                <p>
                    SRP has designated a Privacy Officer responsible for overseeing compliance with
                    this Privacy Policy and applicable privacy legislation. If you have any questions,
                    concerns, or requests regarding this Privacy Policy or the handling of your
                    personal information, please contact us:
                </p>
                <p>
                    <strong>Privacy Officer</strong>
                    <br />
                    Strata Reserve Planning
                    <br />
                    British Columbia, Canada
                </p>
                <p>
                    <strong>Email:</strong> clientcare@stratareserveplanning.com
                </p>
                <p>
                    You may also contact the following regulatory bodies:
                </p>
                <ul>
                    <li>
                        <strong>Office of the Privacy Commissioner of Canada (OPC):</strong>{' '}
                        <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">www.priv.gc.ca</a>
                    </li>
                    <li>
                        <strong>BC Office of the Information and Privacy Commissioner (OIPC):</strong>{' '}
                        <a href="https://www.oipc.bc.ca" target="_blank" rel="noopener noreferrer">www.oipc.bc.ca</a>
                    </li>
                </ul>
            </section>
        </LegalLayout>
    );
};
