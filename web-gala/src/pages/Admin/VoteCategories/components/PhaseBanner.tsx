import useTime, { TimeStatus } from "@/hooks/timeHooks/useTime";

type PhaseInfo = { label: string; color: string; dot: string };

function resolvePhase(
  nominationsOpen: boolean,
  votingOpen: boolean,
): PhaseInfo {
  if (nominationsOpen) {
    return {
      label: "Nomeações abertas",
      color: "border-blue-500/30 bg-blue-500/5 text-blue-300",
      dot: "bg-blue-400",
    };
  }
  if (votingOpen) {
    return {
      label: "Votação aberta",
      color: "border-dark-gold/30 bg-dark-gold/5 text-dark-gold",
      dot: "bg-dark-gold",
    };
  }
  return {
    label: "Fase fechada",
    color: "border-light-gold/20 bg-white/5 text-white/40",
    dot: "bg-white/20",
  };
}

export default function PhaseBanner() {
  const { time } = useTime();
  const nominationsOpen = time?.nominationsStatus === TimeStatus.OPEN;
  const votingOpen = time?.votesStatus === TimeStatus.OPEN;
  const phase = resolvePhase(nominationsOpen, votingOpen);

  return (
    <div
      className={`flex items-center gap-2 border px-4 py-2 text-xs font-semibold ${phase.color}`}
    >
      <span className={`h-2 w-2 rounded-full ${phase.dot}`} />
      Fase atual: {phase.label}
    </div>
  );
}
