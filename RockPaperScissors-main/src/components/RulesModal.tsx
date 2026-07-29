import { useEffect, useRef } from 'react';
import styles from '../styles/Home.module.scss';

interface ModalProps {
  toggleModal: () => void;
  showModal: boolean;
}

export function RulesModal({ toggleModal, showModal }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showModal) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        toggleModal();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

      if (!focusableElements?.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [showModal, toggleModal]);

  return (
    <div
      className={styles.modalContainer}
      style={{ visibility: showModal ? 'visible' : 'hidden' }}
      aria-hidden={!showModal}
    >
      <div
        ref={dialogRef}
        className={`${styles.rulesContainer} ${
          showModal
            ? styles.modalAnimationShowUp
            : styles.modalAnimationClose
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-dialog-title"
      >
        <p id="rules-dialog-title">RULES</p>

        <img src="/image-rules.svg" alt="Rock paper scissors rules" />

        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close rules"
          onClick={toggleModal}
        >
          <img src="/icon-close.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
