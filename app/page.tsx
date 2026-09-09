import Image from "next/image";
import Link from "next/link";
import { TrackedLink } from "./analytics-tracker";
import { CurrentYear } from "./current-year";

const partnerLink = "https://affs.click/VJMdK";
const partnerCode = "R99D9";
const assetVersion = "v=20260901";

const mindsetCards = [
  {
    title: "Disciplined Execution",
    text: "Built on strict rules to remove emotion and improve execution.",
    image: "/assets/cropped/knowledge-discipline.png"
  },
  {
    title: "Psychology Focused",
    text: "Helps you stay consistent, focused and in control.",
    image: "/assets/cropped/knowledge-psychology.png"
  },
  {
    title: "Emotional Control",
    text: "Master your emotions. Build mental strength.",
    image: "/assets/cropped/knowledge-emotional-control.png"
  },
  {
    title: "Consistent Results",
    text: "Designed for long-term consistency, not luck.",
    image: "/assets/cropped/knowledge-consistent-results.png"
  }
];

const accessSteps = [
  "/assets/cropped/access-step-1.png",
  "/assets/cropped/access-step-2.png",
  "/assets/cropped/access-step-3.png",
  "/assets/cropped/access-step-4.png",
  "/assets/cropped/access-step-5.png"
];

const featureCards = [
  ["bot", "Automated Trading", "Executes trades based on proven algorithmic logic."],
  ["shield", "Risk Management", "Built-in risk controls to protect capital."],
  ["monitor", "MT4 & MT5 Compatible", "Works seamlessly on both MetaTrader 4 and 5."],
  ["gear", "Easy To Use", "Simple installation and user-friendly experience."],
  ["refresh", "Regular Updates", "Continuous improvements and new features."]
];

const heroBadges = [
  ["brain", "Smart Algorithm"],
  ["shield", "Risk Management"],
  ["target", "Disciplined Trading"],
  ["monitor", "MT4 & MT5 Compatible"]
];

const confidenceItems = [
  ["headset", "100% Dedicated Support"],
  ["target", "Built For Consistency"],
  ["brain", "Focused On Discipline"],
  ["shield", "Verified By Our Partnership"]
];

const strategyRows = [
  ["Strategy Name", "TFP Edge"],
  ["Risk Level", "Pending data"],
  ["Max Drawdown", "Awaiting source"],
  ["Profit Factor", "Awaiting source"],
  ["Historical Monthly Avg", "Awaiting source"],
  ["Live Verification Status", "Integration pending"]
];

function RiskDisclaimer() {
  return (
    <p className="risk-copy">
      Trading foreign exchange and using automated trading software involves
      significant risk. Past performance, examples, backtests and third-party
      statistics are not indicative of future results. Trading Final Piece
      provides software tools only and does not guarantee trading outcomes.
    </p>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2
  };

  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" {...common} />
          <path d="M4 21c1.7-4 4.3-6 8-6s6.3 2 8 6" {...common} />
        </>
      )}
      {name === "brain" && (
        <>
          <path d="M9 4a4 4 0 0 0-4 4 4 4 0 0 0 0 8 4 4 0 0 0 4 4" {...common} />
          <path d="M15 4a4 4 0 0 1 4 4 4 4 0 0 1 0 8 4 4 0 0 1-4 4" {...common} />
          <path d="M9 4v16M15 4v16M7 10h4M13 10h4M7 14h4M13 14h4" {...common} />
        </>
      )}
      {name === "shield" && <path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" {...common} />}
      {name === "target" && (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <circle cx="12" cy="12" r="4" {...common} />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...common} />
        </>
      )}
      {name === "monitor" && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" {...common} />
          <path d="M8 20h8M12 16v4" {...common} />
        </>
      )}
      {name === "headset" && (
        <>
          <path d="M4 13a8 8 0 0 1 16 0" {...common} />
          <path d="M4 13v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2ZM20 13v4a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2Z" {...common} />
        </>
      )}
      {name === "bot" && (
        <>
          <rect x="5" y="8" width="14" height="10" rx="2" {...common} />
          <path d="M12 4v4M9 13h.01M15 13h.01M9 18v2M15 18v2" {...common} />
        </>
      )}
      {name === "gear" && (
        <>
          <circle cx="12" cy="12" r="3" {...common} />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8L9.3 6.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" {...common} />
        </>
      )}
      {name === "refresh" && (
        <>
          <path d="M20 6v5h-5" {...common} />
          <path d="M4 18v-5h5" {...common} />
          <path d="M18 9a7 7 0 0 0-11.8-2.8L4 8" {...common} />
          <path d="M6 15a7 7 0 0 0 11.8 2.8L20 16" {...common} />
        </>
      )}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="nav-logo" href="/">
          <Image src="/assets/logo.png" alt="Trading Final Piece" width={260} height={108} priority />
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#home">Home</a>
          <a href="#edge">TFP Edge</a>
          <a href="#how">How It Works</a>
          <a href="#access">Get Access</a>
          <a href="#faq">FAQ</a>
          <a href="#about">About</a>
          <a href="#support">Support</a>
        </nav>
        <Link className="login-btn" href="/login"><Icon name="user" /> Login</Link>
      </header>

      <section className="hero" id="home">
        <Image className="hero-art" src="/assets/hero_image.png" alt="" fill priority sizes="100vw" />
        <div className="hero-shade" />
        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              <span className="headline-line">Trade With Precision.</span>
              <span className="headline-line">Eliminate Emotion.</span>
              <strong className="headline-line">Gain Your Edge.</strong>
            </h1>
            <p>
              TFP Edge is a powerful automated trading EA built on discipline,
              psychology and precision to help you trade with confidence.
            </p>
            <div className="hero-badges" aria-label="TFP Edge highlights">
              {heroBadges.map(([icon, label]) => (
                <span key={label}><Icon name={icon} /> {label}</span>
              ))}
            </div>
            <div className="hero-actions">
              <TrackedLink href={partnerLink} eventName="landing_xm_cta_clicked" className="gold-btn" metadata={{ placement: "hero" }}>Get Access To TFP Edge</TrackedLink>
              <Link href="/register" className="dark-btn">Watch Video</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mindset-strip" id="edge">
        {mindsetCards.map((card) => (
          <article key={card.title} className="mindset-card">
            <Image src={card.image} alt="" width={90} height={90} />
            <div>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="how-section" id="how">
        <div className="section-title">
          <h2>How To Get Access To TFP Edge</h2>
          <p>Simple steps to get the Trading the Final Piece EA.</p>
        </div>
        <div className="steps-grid">
          {accessSteps.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt={`Step ${index + 1} to get access to TFP Edge`}
              width={486}
              height={480}
            />
          ))}
        </div>
        <Link href="/register" className="center-gold-btn">Get Started Now</Link>
      </section>

      <section className="account-panels" id="access">
        <article className="account-panel green-panel">
          <div>
            <h2>Don&apos;t Have An XM Account?</h2>
            <p>Register through our official partner link.</p>
            <ul>
              <li>Click the button below to register with XM.</li>
              <li>Complete the registration process.</li>
              <li>Use partner code <strong>{partnerCode}</strong> when creating your account.</li>
              <li>Submit your account for verification.</li>
            </ul>
            <TrackedLink href={partnerLink} eventName="landing_xm_cta_clicked" className="green-btn" metadata={{ placement: "access_panel" }}>Register With Our Link</TrackedLink>
          </div>
          <Image className="xm-laptop-art" src="/assets/xm_laptop.png" alt="XM account registration" width={520} height={290} />
        </article>

        <article className="account-panel blue-panel">
          <div>
            <h2>Already Have An XM Account?</h2>
            <p>Open a new eligible trading account.</p>
            <ul>
              <li>Log in to your XM client area.</li>
              <li>Open a new real trading account.</li>
              <li>Use partner code <strong>{partnerCode}</strong> when creating the account.</li>
              <li>Submit the new account on our website.</li>
            </ul>
            <Link href="/register" className="blue-btn">Create New Account</Link>
          </div>
          <Image className="phone-code-art" src={`/assets/partner_code_cellphone.png?${assetVersion}`} alt="Partner code entered on a mobile device" width={220} height={394} />
        </article>
      </section>

      <section className="about-edge" id="about">
        <div className="product-box">
          <Image src={`/assets/cropped/tfp-edge-box.png?${assetVersion}`} alt="TFP Edge product box" width={178} height={210} />
        </div>
        <div className="about-content">
          <div className="section-title">
            <h2>About TFP Edge</h2>
          </div>
          <div className="features-grid">
            {featureCards.map(([icon, title, text]) => (
              <article key={title}>
                <Icon name={icon} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="performance-panel">
        <div className="section-title">
          <h2>Strategy Performance</h2>
          <p>Ready for dynamic third-party integration and historical backtest data.</p>
        </div>
        <div className="strategy-table">
          {strategyRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <RiskDisclaimer />
      </section>

      <section className="confidence-strip">
        {confidenceItems.map(([icon, label]) => (
          <span key={label}><Icon name={icon} /> {label}</span>
        ))}
      </section>

      <section className="faq-section" id="faq">
        <div className="section-title">
          <h2>FAQ</h2>
        </div>
        <div className="faq-grid">
          <details>
            <summary>Do I pay for EA access?</summary>
            <p>No. Live access is free after your eligible XM account is verified under our partner code.</p>
          </details>
          <details>
            <summary>Can I use a demo account?</summary>
            <p>Yes. Demo users receive a 14-day time-limited trial license.</p>
          </details>
          <details>
            <summary>Can I use any broker?</summary>
            <p>The launch version supports XM only. TFP Edge will support more brokers later.</p>
          </details>
        </div>
      </section>

      <footer className="footer" id="support">
        <div>
          <Image src="/assets/logo.png" alt="Trading Final Piece" width={240} height={100} />
          <p>Trading Final Piece is more than trading. It is discipline, psychology and putting all the pieces together to build a better trader.</p>
        </div>
        <div>
          <h2>Quick Links</h2>
          <a href="#home">Home</a>
          <a href="#edge">TFP Edge</a>
          <a href="#how">How It Works</a>
          <a href="#access">Get Access</a>
        </div>
        <div>
          <h2>Legal</h2>
          <a href="#performance">Risk Disclaimer</a>
          <a href="#performance">Affiliate Disclosure</a>
          <a href="#performance">Privacy Policy</a>
        </div>
        <div className="partner-box">
          <h2>Your Partner Code</h2>
          <strong>{partnerCode}</strong>
          <p>Use this code when creating your XM trading account.</p>
        </div>
        <p className="copyright">Copyright &copy; <CurrentYear /> Trading Final Piece. All rights reserved.</p>
      </footer>
    </main>
  );
}
