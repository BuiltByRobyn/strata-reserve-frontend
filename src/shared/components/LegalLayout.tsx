import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LegalLayoutProps } from '../types/component.types';

export const LegalLayout: React.FC<LegalLayoutProps> = ({ title, children }) => {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="legal-header-content">
                    <button className="btn-link" onClick={() => navigate('/login')}>
                        &larr; Back to Login
                    </button>
                    <div className="legal-logo" onClick={() => navigate('/login')}>
                        <img src="/logonobg.png" alt="Strata Reserve Planning Logo" />
                        <div className="logo-text">
                            <span className="brand">Strata Reserve</span>
                            <span className="subbrand">Planning</span>
                        </div>
                    </div>
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
