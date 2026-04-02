import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal';
import { PrivacyPolicyContent } from '../pages/PrivacyPolicy';
import { TermsOfUseContent } from '../pages/TermsOfUse';
import { HelpContent } from '../pages/Help';

type ModalType = 'privacy' | 'terms' | 'help' | null;

export const Footer = () => {
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const modalTitles: Record<Exclude<ModalType, null>, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    help: 'Help & Documentation',
  };

  const handleLinkClick = (type: ModalType) => (e: React.MouseEvent) => {
    if (user) {
      e.preventDefault();
      setActiveModal(type);
    }
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <span className="site-footer__copyright">
          &copy; {new Date().getFullYear()} Strata Reserve Planning. All rights reserved.
        </span>
        <nav className="site-footer__links">
          <a href="mailto:clientcare@stratareserveplanning.com">Contact Us</a>
          <Link to="/help" onClick={handleLinkClick('help')}>Help</Link>
          <Link to="/privacy" onClick={handleLinkClick('privacy')}>Privacy Policy</Link>
          <Link to="/terms" onClick={handleLinkClick('terms')}>Terms of Use</Link>
        </nav>
      </div>

      {user && (
        <Modal
          isOpen={activeModal !== null}
          onClose={() => setActiveModal(null)}
          title={activeModal ? modalTitles[activeModal] : ''}
          size="large"
        >
          <div className="legal-content">
            {activeModal === 'privacy' && <PrivacyPolicyContent />}
            {activeModal === 'terms' && <TermsOfUseContent />}
            {activeModal === 'help' && <HelpContent />}
          </div>
        </Modal>
      )}
    </footer>
  );
};
