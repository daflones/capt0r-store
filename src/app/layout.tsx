import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'C4pt0r Store',
  description: 'Mod menus premium para FiveM e mais.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            C4PT0R <span>STORE</span>
          </a>
          <nav>
            <a href="/">Loja</a>
            <a href="/conta">Minha conta</a>
            <a href="https://discord.gg/PhkbhxMBy" target="_blank" rel="noreferrer">
              Discord
            </a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>C4pt0r - Mods</span>
          <a href="https://discord.gg/PhkbhxMBy" target="_blank" rel="noreferrer">
            Suporte no Discord
          </a>
        </footer>
      </body>
    </html>
  );
}
