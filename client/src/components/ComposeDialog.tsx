import { useEffect, useRef, useState } from 'react';
import { gmailUrl, isDemoAddress, mailtoUrl, type Compose } from '../studio/mail';

interface Props {
  draft: Compose;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export function ComposeDialog({ draft, onClose, onNotify }: Props) {
  const [to, setTo] = useState(draft.to);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const message = { to, subject, body };
  const heading = draft.kind === 'reply' ? `Reply about ${draft.invoice}` : `Reminder for ${draft.invoice}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Your browser blocked copying. Select the text and copy it by hand.');
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="compose-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="compose-title">{heading}</h2>
        <p className="lede">Written by AI from the invoice facts. Read it, change anything you like, then send it yourself.</p>

        <label className="field">
          <span>To</span>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="field">
          <span>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="field">
          <span>Message</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </label>

        {isDemoAddress(to) && <p className="warn">This is a made-up demo address. Put a real one in the To box before you send.</p>}

        <div className="dialog-actions">
          <button ref={first} className="btn" onClick={() => window.open(gmailUrl(message), '_blank', 'noopener')}>
            Open in Gmail
          </button>
          <button className="btn btn-quiet" onClick={() => (window.location.href = mailtoUrl(message))}>
            Open in mail app
          </button>
          <button className="btn btn-quiet" onClick={copy}>
            {copied ? 'Copied' : 'Copy message'}
          </button>
          <span className="grow" />
          <button className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="fineprint">Gmail opens in the Google account you are signed in to. Nothing is sent until you press Send there.</p>
      </div>
    </div>
  );
}
