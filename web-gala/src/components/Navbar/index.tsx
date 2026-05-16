import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faUser,
  faUsersGear,
} from "@fortawesome/free-solid-svg-icons";
import useLoginLink from "@/hooks/useLoginLink";
import { useUserStore } from "@/stores/useUserStore";
import NEIService from "@/services/NEIService";

async function handleLogout() {
  const { end_session_url: endSessionUrl } = await NEIService.logout().catch(
    () => ({
      end_session_url: null,
    }),
  );
  useUserStore.getState().logout();
  globalThis.location.replace(endSessionUrl ?? "/");
}

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);
  const displayName = [name, surname].filter(Boolean).join(" ");
  const isAdmin = scopes?.some((role) =>
    ["admin", "manager-gala"].includes(role),
  );

  return (
    <header className="fixed top-0 z-50 w-full">
      <nav
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? "border-light-gold/15 border-b bg-[#182c2a]/90 shadow-lg backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link
            to="/"
            onClick={closeMenu}
            className="group flex items-center font-gala"
          >
            <img
              src="/gala/gala-logo.png"
              alt="NEI Logo"
              className="h-12 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex" />

          {/* Desktop auth */}
          <div className="hidden items-center gap-4 md:flex">
            {!sessionLoading && !token && (
              <>
                <a
                  href={loginLink}
                  className="font-gala text-[0.8rem] font-semibold text-white/50 transition-colors hover:text-white/80"
                >
                  Entrar
                </a>
                <a
                  href={loginLink}
                  className="border border-light-gold/60 px-5 py-2 font-gala text-[0.8rem] font-bold text-light-gold transition-all hover:border-light-gold hover:bg-light-gold hover:text-black"
                >
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
                    <FontAwesomeIcon
                      icon={faUsersGear}
                      className="text-[0.7rem] text-light-gold/50"
                    />
                    Admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 font-gala text-[0.8rem] font-semibold text-white/60 transition-colors hover:text-light-gold"
                >
                  <FontAwesomeIcon
                    icon={faUser}
                    className="text-[0.7rem] text-light-gold/50"
                  />
                  {displayName || "Perfil"}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-gala text-[0.8rem] font-semibold text-white/40 transition-colors hover:text-red-400"
                >
                  Sair
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-light-gold/30 text-light-gold transition-colors hover:border-light-gold md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <FontAwesomeIcon
              icon={isMobileMenuOpen ? faXmark : faBars}
              className="text-sm"
            />
          </button>
        </div>
      </nav>

      {/* Mobile drawer - full-screen overlay slide from right */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={closeMenu}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-[#203836] shadow-2xl md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-light-gold/20 px-5 py-4">
                <img
                  src="/gala/gala-logo.png"
                  alt="NEI Logo"
                  className="h-10 w-auto"
                />
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-light-gold/20 text-white/50 transition-colors hover:border-white/25 hover:text-white/80"
                  aria-label="Fechar menu"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 px-3 py-4" />

              {/* Divider */}
              <div className="mx-5 border-t border-light-gold/20" />

              {/* Auth section */}
              <div className="flex flex-col gap-2 px-4 py-5">
                {!sessionLoading && !token && (
                  <>
                    <a
                      href={loginLink}
                      onClick={closeMenu}
                      className="flex items-center justify-center border border-light-gold/60 px-5 py-3.5 font-gala text-sm font-bold text-light-gold transition-all hover:bg-light-gold hover:text-black"
                    >
                      Inscrever
                    </a>
                    <a
                      href={loginLink}
                      onClick={closeMenu}
                      className="flex items-center justify-center py-3 font-gala text-sm font-semibold text-white/40 transition-colors hover:text-white/70"
                    >
                      Já tens conta? Entrar
                    </a>
                  </>
                )}

                {!sessionLoading && token && (
                  <>
                    {displayName && (
                      <div className="mb-1 px-1">
                        <p className="text-[0.6rem] uppercase tracking-widest text-white/30">
                          Sessão iniciada como
                        </p>
                        <p className="mt-0.5 font-gala text-sm font-semibold text-white/70">
                          {displayName}
                        </p>
                      </div>
                    )}

                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className="flex items-center gap-3 border border-light-gold/20 px-4 py-3.5 font-gala text-sm font-semibold text-white/60 transition-all hover:border-light-gold/30 hover:text-light-gold"
                    >
                      <FontAwesomeIcon
                        icon={faUser}
                        className="w-4 text-light-gold/40"
                      />
                      O Meu Perfil
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={closeMenu}
                        className="flex items-center gap-3 border border-light-gold/20 px-4 py-3.5 font-gala text-sm font-semibold text-white/60 transition-all hover:border-light-gold/30 hover:text-light-gold"
                      >
                        <FontAwesomeIcon
                          icon={faUsersGear}
                          className="w-4 text-light-gold/40"
                        />
                        Painel Admin
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        handleLogout();
                      }}
                      className="mt-1 flex items-center justify-center py-3 font-gala text-sm font-semibold text-white/30 transition-colors hover:text-red-400"
                    >
                      Terminar Sessão
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
