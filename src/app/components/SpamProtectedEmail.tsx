'use client';

import { useState, useEffect } from 'react';

interface SpamProtectedEmailProps {
  user: string;
  domain: string;
  tld: string;
  subject?: string;
  className?: string;
}

export default function SpamProtectedEmail({ user, domain, tld, subject, className }: SpamProtectedEmailProps) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    // This effect runs only on the client-side after hydration
    setEmail(`${user}@${domain}.${tld}`);
  }, [user, domain, tld]);

  // On the server and during the initial render, this will be empty.
  if (!email) {
    return <span className={className}>...</span>;
  }

  const mailtoLink = subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;

  return (
    <a href={mailtoLink} className={className}>
      {email}
    </a>
  );
}
