import { useMediaQuery } from '../hooks/useMediaQuery';
import type { ModalProps } from '../types/component.types';

export const Modal = ({ isOpen, onClose, title, size = 'medium', className, footer, children }: ModalProps) => {
  const isDesktop = useMediaQuery('(min-width: 750px)');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={isDesktop ? undefined : onClose}>
      <div className={`modal-content modal-${size}${className ? ` ${className}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
