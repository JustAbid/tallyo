export interface Compose {
  kind: 'reminder' | 'reply';
  invoice: string;
  to: string;
  subject: string;
  body: string;
}

const enc = encodeURIComponent;

// Opens Gmail's compose window with everything filled in. Gmail uses whichever Google account
// the person is already signed in to, and nothing is sent until they press Send there.
export const gmailUrl = ({ to, subject, body }: Pick<Compose, 'to' | 'subject' | 'body'>) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;

// The same thing for whatever mail app the computer is set up to use.
export const mailtoUrl = ({ to, subject, body }: Pick<Compose, 'to' | 'subject' | 'body'>) =>
  `mailto:${to}?subject=${enc(subject)}&body=${enc(body.replace(/\r?\n/g, '\r\n'))}`;

export const isDemoAddress = (address: string) => /\.example$/i.test(address.trim());
