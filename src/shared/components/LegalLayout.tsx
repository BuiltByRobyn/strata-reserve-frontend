import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalLayoutProps {
    title: string;
    children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ title, children }) => {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="legal-header-content">
                    <div className="legal-logo" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
                        <img src="/logonobg.png" alt="Strata Reserve Planning Logo" />
                        <div className="logo-text">
                            <span className="brand">Strata Reserve</span>
                            <span className="subbrand">Planning</span>
                        </div>
                    </div>
                    <button className="btn-link" onClick={() => navigate('/login')}>
                        &larr; Back to Login
                    </button>
                </div>
            </header>

            <main className="legal-container">
                <article className="legal-document">
                    <h1>{title}</h1>
                    <div className="legal-content">
                        {children}
                    </div>
                </article>
            </main>

            <footer className="legal-footer">
                <p>&copy; {new Date().getFullYear()} Strata Reserve Planning. All rights reserved.</p>
            </footer>
        </div>
    );
};
