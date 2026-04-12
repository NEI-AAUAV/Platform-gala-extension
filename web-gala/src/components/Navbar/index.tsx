import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import useLoginLink from "@/hooks/useLoginLink";
import { useUserStore } from "@/stores/useUserStore";
import NEIService from "@/services/NEIService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faUser, faUsersGear } from "@fortawesome/free-solid-svg-icons";




async function handleLogout() {
  const { end_session_url } = await NEIService.logout().catch(() => ({
    end_session_url: null,
  }));
  useUserStore.getState().logout();
  globalThis.location.replace(end_session_url ?? "/");
}

const navLinkClass =
  "relative font-gala text-[0.8rem] font-semibold uppercase tracking-widest text-white/60 transition-colors duration-200 hover:text-light-gold after:absolute after:bottom-[-4px] after:left-0 after:h-[1px] after:w-0 after:bg-light-gold after:transition-all after:duration-300 hover:after:w-full";

export default function Navbar() {
  const { token, sessionLoading, name, surname, scopes } = useUserStore();
  const loginLink = useLoginLink();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const closeMenu = () => setIsMobileMenuOpen(false);
  const displayName = [name, surname].filter(Boolean).join(" ");
  const isAdmin = scopes?.some((role) => ["admin", "manager-jantar-gala", "manager-gala"].includes(role));

  return (
    <header className="fixed top-0 z-50 w-full">
      <nav
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? "border-b border-light-gold/15 bg-[#050505]/90 shadow-lg backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" onClick={closeMenu} className="flex items-center font-gala group">
            <img src="/gala/logo.svg" alt="NEI Logo" className="h-12 w-auto transition-transform group-hover:scale-105" />
          </Link>




          <div className="hidden items-center gap-8 md:flex">
            <a href="/#sobre" className={navLinkClass}>Sobre</a>
            <a href="/#timeline" className={navLinkClass}>Fases</a>
            <Link to="/vote" className={navLinkClass}>Nomeados</Link>
          </div>


          <div className="hidden items-center gap-4 md:flex">
            {!sessionLoading && !token && (
              <>
                <a href={loginLink} className="font-gala text-[0.8rem] font-semibold text-white/50 transition-colors hover:text-white/80">
                  Entrar
                </a>
                <a href={loginLink} className="border border-light-gold/60 px-5 py-2 font-gala text-[0.8rem] font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black">
                  Inscrever
                </a>
              </>
            )}

            {!sessionLoading && token && (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 font-gala text-[0.8rem] font-semibold text-white/60 transition-colors hover:text-light-gold"
                  >
                    <FontAwesomeIcon icon={faUsersGear} className="text-[0.7rem] text-light-gold/50" />
                    Admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 font-gala text-[0.8rem] font-semibold text-white/60 transition-colors hover:text-light-gold"
                >
                  <FontAwesomeIcon icon={faUser} className="text-[0.7rem] text-light-gold/50" />
                  {displayName || "Perfil"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="font-gala text-[0.8rem] font-semibold text-white/40 transition-colors hover:text-red-400"
                >
                  Sair
                </button>
              </>
            )}
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center border border-light-gold/30 text-light-gold transition-colors hover:border-light-gold md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} className="text-sm" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-b border-light-gold/15 bg-[#050505]/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col px-4 py-4">
              {([
                { href: "/#sobre", label: "Sobre" },
                { href: "/#timeline", label: "Fases" },
              ] as const).map(({ href, label }) => (

                <a
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="border-b border-white/5 py-3 font-gala text-sm font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-light-gold"
                >
                  {label}
                </a>
              ))}
              <Link
                to="/vote"
                onClick={closeMenu}
                className="border-b border-white/5 py-3 font-gala text-sm font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-light-gold"
              >
                Nomeados
              </Link>

              <div className="flex flex-col gap-3 pt-5">
                {!sessionLoading && !token && (
                  <a
                    href={loginLink}
                    onClick={closeMenu}
                    className="border border-light-gold/60 px-5 py-3 text-center font-gala text-sm font-bold text-light-gold transition-all hover:bg-light-gold hover:text-black"
                  >
                    Inscrever
                  </a>
                )}
                {!sessionLoading && token && (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={closeMenu}
                        className="flex items-center justify-center gap-2 border border-white/20 px-5 py-3 font-gala text-sm font-semibold text-white/60 transition-all hover:border-light-gold/40 hover:text-light-gold"
                      >
                        <FontAwesomeIcon icon={faUsersGear} className="text-[0.7rem]" />
                        Admin
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 border border-white/20 px-5 py-3 font-gala text-sm font-semibold text-white/60 transition-all hover:border-light-gold/40 hover:text-light-gold"
                    >
                      <FontAwesomeIcon icon={faUser} className="text-[0.7rem]" />
                      {displayName || "Perfil"}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="py-3 font-gala text-sm font-semibold text-white/40 transition-colors hover:text-red-400"
                    >
                      Sair
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
