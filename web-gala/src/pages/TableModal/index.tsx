import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";
import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";
import useTables from "@/hooks/tableHooks/useTables";
import useTable from "@/hooks/tableHooks/useTable";
import EditTable from "./EditTable";
import ViewTable from "./ViewTable";
import ClaimTable from "./ClaimTable";

type TableModalProps = {
  readonly tableId: number;
  readonly onClose?: () => void;
};

function calculateOccupiedSeats(persons: Person[]) {
  return persons.reduce((acc, person) => acc + 1 + person.companions.length, 0);
}

function normalizeId(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Determines which modal page to render based on user state, table state, and time constraints.
 * All hooks are called unconditionally at the top to comply with React's Rules of Hooks.
 */
function useModalPage(tableId: number) {
  const { table, isLoading: tableLoading, mutate } = useTable(tableId);
  const { tables } = useTables();
  const { sessionUser, state } = useSessionUser();
  const { time } = useTime();

  useEffect(() => {
    if (!tableLoading) mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading or missing data - render nothing
  if (tableLoading || !time) return null;

  // Table doesn't exist - redirect
  if (table === undefined) return <Navigate to="/reserve" />;

  const occupied = calculateOccupiedSeats(table.persons);
  const currentUserId =
    normalizeId(sessionUser?._id) ?? normalizeId(sessionUser?.sub);

  const inAnyTable =
    currentUserId != null &&
    tables.some((t) =>
      t.persons.some((p) => normalizeId(p.id) === currentUserId),
    );

  const inTable =
    currentUserId != null &&
    table.persons.some((p) => normalizeId(p.id) === currentUserId);

  // Permission parity with backend: admin checks happen server-side; here we allow
  // local edit mode when the user is head, owner or first person in the table.
  const tableHeadId = normalizeId(table.head);
  const tableOwnerId = normalizeId(table.owner_id);
  const firstPersonId = normalizeId(table.persons[0]?.id);
  const canManageTable =
    currentUserId != null &&
    (tableHeadId === currentUserId ||
      tableOwnerId === currentUserId ||
      firstPersonId === currentUserId);

  if (import.meta.env.DEV) {
    // Debug helper for permission issues in table modal.
    // eslint-disable-next-line no-console
    console.log("[TableModal] permission-check", {
      tableId: table._id,
      currentUserId,
      tableHeadId,
      tableOwnerId,
      firstPersonId,
      inAnyTable,
      inTable,
      canManageTable,
      sessionState: state,
      tablesStatus: time.tablesStatus,
    });
  }

  // Check if the current user is invited to THIS specific table
  const isInvited =
    currentUserId != null &&
    (table.invites ?? []).some((uid) => normalizeId(uid) === currentUserId);

  if (canManageTable) {
    return <EditTable table={table} mutate={mutate} />;
  }
  if (state !== State.REGISTERED || time.tablesStatus !== TimeStatus.OPEN) {
    return <ViewTable table={table} inTable={false} mutate={mutate} />;
  }
  if (occupied === 0 && !inAnyTable) {
    return <ClaimTable table={table} mutate={mutate} />;
  }
  if (inTable || (inAnyTable && occupied > 0)) {
    return <ViewTable table={table} inTable={inTable} mutate={mutate} />;
  }
  if (isInvited && !inAnyTable) {
    // User has been invited to this table - show an accept/decline view
    return (
      <ViewTable table={table} inTable={false} mutate={mutate} isInvited />
    );
  }
  return <ViewTable table={table} inTable={false} mutate={mutate} />;
}

function useModal() {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    modalRef.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return modalRef;
}

export default function TableModal({ tableId, onClose }: TableModalProps) {
  const modalRef = useModal();
  const navigate = useNavigate();
  const modalPage = useModalPage(tableId);

  useEffect(() => {
    function cancelHandler(e: Event) {
      e.preventDefault();
    }

    modalRef.current?.addEventListener("cancel", cancelHandler);
    return () => {
      modalRef.current?.removeEventListener("cancel", cancelHandler);
    };
  }, []);

  return (
    <dialog
      ref={modalRef}
      className={classNames(
        "relative m-0 grid h-screen max-h-none w-screen max-w-none items-center overflow-y-scroll bg-transparent p-0 text-white/70 backdrop:bg-black/80",
      )}
    >
      <AnimatePresence>
        {!!modalPage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 my-16 rounded-3xl border border-light-gold/20 bg-[#0a0a0a] px-4 py-12 shadow-2xl backdrop-blur-xl sm:px-12 md:mx-auto md:h-auto md:max-w-4xl"
          >
            <button
              className="absolute right-6 top-6 text-xl text-white/30 transition-colors hover:text-white/80"
              type="button"
              onClick={() => (onClose ? onClose() : navigate("/reserve"))}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
            {modalPage}
          </motion.div>
        )}
      </AnimatePresence>
      {onClose ? (
        <button
          type="button"
          aria-label="Fechar modal"
          className="absolute inset-0 -z-10"
          onClick={onClose}
        />
      ) : (
        <Link className="absolute inset-0 -z-10" to="/reserve" />
      )}
    </dialog>
  );
}
