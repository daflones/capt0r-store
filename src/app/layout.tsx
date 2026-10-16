import "./globals.css";
import type { Metadata } from "next";
import { DISCORD_URL } from "@/lib/store";

export const metadata: Metadata = {
  title: "C4PT0R Store | Mods & Tools",
  description:
    "Explore o catálogo C4PT0R. Compare mod menus, escolha sua licença digital e encontre suporte na comunidade.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <div className="announcement">
          C4PT0R COLLECTION <span>•</span> Conheça os produtos e encontre sua
          próxima experiência{" "}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">
            FALE COM O SUPORTE ↗
          </a>
        </div>
        <header className="topbar">
          <a href="/" className="brand">
            <span className="brand-mark">C4</span>C4PT0R
            <span className="brand-store">STORE</span>
          </a>
          <nav aria-label="Navegação principal">
            <a href="/#catalogo">Catálogo</a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Comunidade ↗
            </a>
            <a className="account-link" href="/conta">
              Minha conta <span>↗</span>
            </a>
          </nav>
        </header>
        <main id="conteudo">{children}</main>
        <footer className="footer">
          <div>
            <a className="brand" href="/">
              C4PT0R <span>STORE</span>
            </a>
            <p>Mods, ferramentas e novas possibilidades.</p>
            <small>
              Loja independente. Sem afiliação com Rockstar Games ou Cfx.re.
            </small>
          </div>
          <div className="footer-links">
            <a href="/#catalogo">Catálogo</a>
            <a href="/conta">Minha conta</a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Suporte ↗
            </a>
          </div>
        </footer>
        <a
          className="discord-float"
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir suporte da C4PT0R no Discord (nova aba)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.7 5.1A18 18 0 0 0 15.5 4l-.5 1a16 16 0 0 0-6 0l-.5-1a18 18 0 0 0-4.2 1.1C1.7 9 .9 12.8 1.3 16.5a17 17 0 0 0 5.2 2.6l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a17 17 0 0 0 5.2-2.6c.5-4.3-.8-8.1-3-11.4ZM8.5 14.3c-1 0-1.7-.9-1.7-2s.7-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2Zm7 0c-1 0-1.7-.9-1.7-2s.7-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2Z"
            />
          </svg>
          <span>
            Precisa de ajuda?<strong>Entre no Discord ↗</strong>
          </span>
        </a>
      </body>
    </html>
  );
}
