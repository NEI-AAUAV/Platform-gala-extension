import { useEffect, useState } from "react";
import GalaService, {
  Manager,
  ManagerPermissionKey,
} from "@/services/GalaService";
import { useAppToast } from "@/components/ui/Toast";
import { extractApiError } from "@/utils/apiError";

const ALL_PERMISSIONS: { key: ManagerPermissionKey; label: string }[] = [
  { key: "registration", label: "Inscrições" },
  { key: "tables", label: "Mesas" },
  { key: "categories", label: "Categorias & Resultados" },
  { key: "homepage", label: "Homepage" },
  { key: "buses", label: "Autocarros" },
];

function PermissionToggle({
  enabled,
  label,
  onChange,
}: {
  readonly enabled: boolean;
  readonly label: string;
  readonly onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        className={[
          "relative h-5 w-9 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-dark-gold/50",
          enabled ? "bg-dark-gold" : "bg-white/15",
        ].join(" ")}
        onClick={() => onChange(!enabled)}
      >
        <div
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
      <span className="text-sm text-white/70">{label}</span>
    </div>
  );
}

function ManagerRow({
  manager,
  onUpdated,
}: {
  readonly manager: Manager;
  readonly onUpdated: (m: Manager) => void;
}) {
  const [perms, setPerms] = useState<Set<ManagerPermissionKey>>(
    new Set(manager.permissions),
  );
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  const toggle = (key: ManagerPermissionKey, enabled: boolean) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await GalaService.permissions.setManagerPermissions(
        manager._id,
        [...perms],
        manager.name,
        manager.email,
      );
      onUpdated(updated);
      toast.success("Permissões guardadas.");
    } catch (e) {
      toast.error(extractApiError(e, "Erro ao guardar permissões."));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    [...perms].sort((a, b) => a.localeCompare(b)).join() !== 
    [...manager.permissions].sort((a, b) => a.localeCompare(b)).join();

  return (
    <div className="border-white/8 bg-white/3 flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{manager.name}</p>
          <p className="text-xs text-white/40">{manager.email}</p>
          <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-white/20">
            ID Authentik: {manager._id}
          </p>
        </div>
        <button
          type="button"
          disabled={!hasChanges || saving}
          onClick={save}
          className="shrink-0 rounded-full bg-dark-gold px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-600 disabled:opacity-30"
        >
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_PERMISSIONS.map(({ key, label }) => (
          <PermissionToggle
            key={key}
            label={label}
            enabled={perms.has(key)}
            onChange={(v) => toggle(key, v)}
          />
        ))}
      </div>

      {perms.size === 0 && (
        <p className="text-xs text-yellow-400/60">
          Sem permissões — este manager não tem acesso a nenhuma funcionalidade.
        </p>
      )}
    </div>
  );
}

export default function PermissoesAdmin() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useAppToast();

  useEffect(() => {
    GalaService.permissions
      .listManagers()
      .then(setManagers)
      .catch(() => toast.error("Erro ao carregar managers."))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdated = (updated: Manager) => {
    setManagers((prev) =>
      prev.map((m) => (m._id === updated._id ? updated : m)),
    );
  };

  if (loading) {
    return <p className="text-sm text-white/40">A carregar...</p>;
  }

  if (managers.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Nenhum utilizador com o role manager-gala encontrado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/40">
        Gestão individual das permissões de cada manager-gala. Por defeito,
        novos managers não têm acesso a nenhuma funcionalidade.
      </p>
      {managers.map((m) => (
        <ManagerRow key={m._id} manager={m} onUpdated={handleUpdated} />
      ))}
    </div>
  );
}
