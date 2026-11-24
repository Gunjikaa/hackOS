import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HackOS — College-First Hackathon Platform',
  description: 'AI-assisted, unified hackathon and event lifecycle management platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
