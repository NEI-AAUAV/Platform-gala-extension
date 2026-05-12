import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTable,
  faCheckToSlot,
  faUsersGear,
  faTicket,
  faAward,
} from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import { useUserStore, shallow } from "@/stores/useUserStore";
import Avatar from "../Avatar";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";

type NavigationProps = {
  className?: string;
};

export default function Navigation({ className }: Readonly<NavigationProps>) {
  const location = useLocation().pathname;
  const { name, scopes } = useUserStore((state) => state, shallow);
  const { time } = useTime();

  const showRegistration = time?.registrationStatus !== TimeStatus.CLOSED;
  const showTables = time?.tablesStatus !== TimeStatus.CLOSED;
  const showNominations = time?.nominationsStatus !== TimeStatus.CLOSED;
  const showVoting = time?.votesStatus !== TimeStatus.CLOSED;

  return (
    <nav className={className}>
      <ul className="flex flex-col gap-4 font-gala text-[0.7rem] uppercase tracking-widest md:flex-row md:gap-4 lg:gap-8">
        {showRegistration && (
          <li>
            <Link
              className={classNames(
                "block px-3 py-2 transition-colors hover:text-light-gold",
                location === "/register" && "text-light-gold",
              )}
              to="/register"
            >
              <FontAwesomeIcon icon={faTicket} className="mr-2" /> Inscrição
            </Link>
          </li>
        )}
        {showTables && (
          <li>
            <Link
              className={classNames(
                "block px-3 py-2 transition-colors hover:text-light-gold",
                location.startsWith("/reserve") && "text-light-gold",
              )}
              to="/reserve"
            >
              <FontAwesomeIcon icon={faTable} className="mr-2" /> Mesas
            </Link>
          </li>
        )}
        {showNominations && (
          <li>
            <Link
              className={classNames(
                "block px-3 py-2 transition-colors hover:text-light-gold",
                location.startsWith("/nominate") && "text-light-gold",
              )}
              to="/nominate"
            >
              <FontAwesomeIcon icon={faAward} className="mr-2" /> Nomeações
            </Link>
          </li>
        )}
        {showVoting && (
          <li>
            <Link
              className={classNames(
                "block px-3 py-2 transition-colors hover:text-light-gold",
                location.startsWith("/vote") && "text-light-gold",
              )}
              to="/vote"
            >
              <FontAwesomeIcon icon={faCheckToSlot} className="mr-2" /> Votações
            </Link>
          </li>
        )}
        {(scopes?.includes("admin") || scopes?.includes("manager-gala")) && (
          <li>
            <Link
              className={classNames(
                "block px-3 py-2 transition-colors hover:text-light-gold",
                location.startsWith("/admin") && "text-light-gold",
              )}
              to="/admin"
            >
              <FontAwesomeIcon icon={faUsersGear} className="mr-2" /> Admin
            </Link>
          </li>
        )}
        {name !== undefined && (
          <li className="ml-2">
            <Link
              className={classNames(
                "block rounded-full border border-light-gold/20 p-1 transition-all hover:border-light-gold/50",
                location.startsWith("/profile") && "border-light-gold",
              )}
              to="/profile"
              title={name}
            >
              <Avatar alt="profile" className="w-6" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

Navigation.defaultProps = {
  className: "",
};
