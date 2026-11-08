import { site, socials } from "@/lib/content";
import { EmailActions } from "./EmailActions";

export function Contact() {
  const [emailUser, emailDomain] = site.email.split("@");
  return (
    <section id="contact" className="contact">
      <div className="contact-sun" aria-hidden="true">
        <div className="contact-sun-ring" />
        <div className="contact-sun-disc" />
      </div>
      <div className="container contact-inner">
        <h2 className="contact-title">Wanna talk to me?</h2>
        <EmailActions user={emailUser} domain={emailDomain} />
        <ul className="contact-links">
          {socials.map((s) => (
            <li key={s.name}>
              <a href={s.href} rel="me">
                <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={s.icon} />
                </svg>
                <span>{s.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>
          © {site.year} {site.name}
        </span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
