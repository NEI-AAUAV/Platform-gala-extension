import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faBus,
  faChair,
  faUserGroup,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { StatCard } from "./StatsComponents";
import { RegistrantsStats } from "@/utils/registrantsStats";

export default function RegistrantsStatsGrid({
  stats,
}: Readonly<{ stats: RegistrantsStats }>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Total inscritos"
        value={stats.total}
        icon={<FontAwesomeIcon icon={faUserGroup} />}
      />
      <StatCard
        label="Pagamentos confirmados"
        value={stats.paid}
        accent="green"
        icon={<FontAwesomeIcon icon={faCircleCheck} />}
      />
      <StatCard
        label="Comprovativo enviado"
        value={stats.proofSent}
        accent="yellow"
        icon={<FontAwesomeIcon icon={faClock} />}
      />
      <StatCard
        label="Sem comprovativo"
        value={stats.pending}
        accent="red"
        icon={<FontAwesomeIcon icon={faCircleXmark} />}
      />
      <StatCard
        label="Com mesa"
        value={stats.withTable}
        sub={`${stats.total - stats.withTable} sem mesa`}
        icon={<FontAwesomeIcon icon={faChair} />}
      />
      <StatCard
        label="Com autocarro"
        value={stats.withBus}
        sub={`${stats.total - stats.withBus} sem autocarro`}
        icon={<FontAwesomeIcon icon={faBus} />}
      />
    </div>
  );
}
