import type { Metadata } from 'next';
import './globals.css'; // Optional: Add global styles if needed

export const metadata: Metadata = {
  title: 'NormalDB',
  description: 'ER to Normal Forms Visualization',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
