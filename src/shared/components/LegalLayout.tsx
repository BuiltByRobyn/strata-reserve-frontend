import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LegalLayoutProps } from '../types/component.types';
import { Footer } from './Footer';

export const LegalLayout: React.FC<LegalLayoutProps> = ({ title, children }) => {
    const navigate = useNavigate();
    const hasHistory = window.history.length > 1;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [title]);

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="legal-header-content">
                    {hasHistory && (
                        <button className="btn-link" onClick={() => navigate(-1)}>
                            Back
                        </button>
                    )}
                    <div className="legal-logo" onClick={() => navigate('/login')}>
                        <img src="/logonobg.png" alt="Strata Reserve Planning Logo" />
                        <div className="logo-text">
                            <span className="brand">Strata Reserve Planning</span>
                            <span className="subbrand">Data Collection Postal</span>
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

            <Footer />
        </div>
    );
};
