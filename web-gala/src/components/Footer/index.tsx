import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faEnvelope } from "@fortawesome/free-solid-svg-icons";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    Icon: InstagramIcon,
    href: "https://www.instagram.com/nei.aauav/",
    label: "Instagram",
  },
  {
    Icon: LinkedInIcon,
    href: "https://www.linkedin.com/company/nei-aauav/",
    label: "LinkedIn",
  },
  {
    Icon: FacebookIcon,
    href: "https://www.facebook.com/NEIAAUAv",
    label: "Facebook",
  },
  { Icon: GitHubIcon, href: "https://github.com/nei-aauav", label: "GitHub" },
] as const;

export default function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden bg-[#182c2a]">
      {/* Background Map - Now local to Footer */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden">
        <img
          src="/gala/map-black.png"
          alt="NEI Map Background"
          className="h-full w-full scale-110 object-cover object-center opacity-[0.2] grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#182c2a] via-transparent to-[#182c2a]" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 py-14 md:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-2">
          {/* Branding */}
          <div className="flex flex-col items-start gap-4">
            <Link to="/" className="group flex items-center font-gala">
              <img
                src="/gala/nei-logo-horizontal.png"
                alt="NEI Logo"
                className="h-24 w-auto transition-transform group-hover:scale-105"
              />
            </Link>

            <p className="font-gala text-xs leading-relaxed text-white/40">
              Núcleo de Estudantes de Informática da AAUAv.
            </p>
          </div>

          {/* Contact + Social */}
          <div>
            <h4 className="font-gala text-[0.65rem] font-bold uppercase tracking-[0.25em] text-light-gold/60">
              Contacto
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="https://goo.gl/maps/JZY6mi3T9T6UxE3z6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-gala text-xs text-white/40 transition-colors hover:text-light-gold"
                >
                  <FontAwesomeIcon
                    icon={faLocationDot}
                    className="w-3 shrink-0"
                  />
                  3810-193 Aveiro, Portugal
                </a>
              </li>
              <li>
                <a
                  href="mailto:nei@aauav.pt"
                  className="flex items-center gap-2 font-gala text-xs text-white/40 transition-colors hover:text-light-gold"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="w-3 shrink-0" />
                  nei@aauav.pt
                </a>
              </li>
            </ul>

            <div className="mt-6 flex gap-3">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="border-white/15 flex h-8 w-8 items-center justify-center border text-white/40 transition-all hover:border-light-gold/60 hover:text-light-gold"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="font-gala text-[0.65rem] uppercase tracking-wider text-white/25">
            &copy; {new Date().getFullYear()} NEI-AAUAv. Todos os direitos
            reservados.
          </p>
          <p className="font-gala text-[0.65rem] uppercase tracking-wider text-white/25">
            A apoiar os estudantes desde 2013.
          </p>
        </div>
      </div>
    </footer>
  );
}
