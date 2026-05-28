import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faCalendarCheck,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import type { RegistrationConfig } from "@/config/registrationConfig";
import type { PaymentInfoConfig } from "@/hooks/useHomepageConfig";
import useTime from "@/hooks/timeHooks/useTime";
import { formatDateTimePT } from "@/utils/formatDate";
import { formatPaymentDeadline } from "@/utils/paymentDeadline";

interface Props {
  readonly paymentInfoConfig: PaymentInfoConfig;
  readonly registrationConfig: RegistrationConfig;
}

export default function PaymentInfoSection({
  paymentInfoConfig,
  registrationConfig,
}: Props) {
  const { time } = useTime();
  if (!paymentInfoConfig.visible) return null;

  const {
    phasedPaymentEnabled,
    phase1Price,
    phase1Deadline,
    phase2Price,
    phase2Deadline,
    eventPrice,
  } = registrationConfig;
  const registrationOpenDate = time?.registrationStart
    ? formatDateTimePT(time.registrationStart)
    : "A anunciar";
  const registrationCloseDate = time?.registrationEnd
    ? formatDateTimePT(time.registrationEnd)
    : "A anunciar";

  return (
    <section id="pagamento" className="relative px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="font-gala text-sm font-bold uppercase tracking-[0.4em] text-light-gold/60">
            Inscrição
          </span>
          <h2 className="mt-4 font-gala text-[3.5rem] font-black tracking-tight text-white sm:text-[4.5rem]">
            Valores e Datas
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {phasedPaymentEnabled ? (
            <>
              <PriceCard
                index={0}
                icon={faMoneyBillWave}
                label="1ª Fase"
                amount={phase1Price}
                deadline={phase1Deadline}
                highlight
              />
              <PriceCard
                index={1}
                icon={faMoneyBillWave}
                label="2ª Fase"
                amount={phase2Price}
                deadline={phase2Deadline}
              />
            </>
          ) : (
            <PriceCard
              index={0}
              icon={faCreditCard}
              label="Preço"
              amount={eventPrice}
              deadline={registrationConfig.paymentDeadlineDate}
              highlight
            />
          )}
          <DeadlineCard
            index={phasedPaymentEnabled ? 2 : 1}
            registrationConfig={registrationConfig}
            registrationOpenDate={registrationOpenDate}
            registrationCloseDate={registrationCloseDate}
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  index,
  icon,
  label,
  amount,
  deadline,
  highlight = false,
}: {
  readonly index: number;
  readonly icon: typeof faCreditCard;
  readonly label: string;
  readonly amount: number;
  readonly deadline: string;
  readonly highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className={[
        "relative overflow-hidden border p-8 text-center",
        highlight
          ? "border-light-gold/30 bg-light-gold/5 shadow-[0_0_40px_rgba(212,175,55,0.07)]"
          : "bg-white/3 border-light-gold/20",
      ].join(" ")}
    >
      {highlight && (
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-light-gold/40 to-transparent" />
      )}
      <FontAwesomeIcon
        icon={icon}
        className="mb-4 text-2xl text-light-gold/50"
      />
      <p className="font-gala text-xs font-bold uppercase tracking-[0.3em] text-white/40">
        {label}
      </p>
      <p className="mt-2 font-gala text-5xl font-black text-light-gold">
        {amount}€
      </p>
      {deadline && deadline !== "A anunciar" && (
        <p className="mt-4 font-gala text-xs text-white/40">
          Até <span className="text-white/65">{formatPaymentDeadline(deadline)}</span>
        </p>
      )}
    </motion.div>
  );
}

function DeadlineCard({
  index,
  registrationConfig,
  registrationOpenDate,
  registrationCloseDate,
}: {
  readonly index: number;
  readonly registrationConfig: RegistrationConfig;
  readonly registrationOpenDate: string;
  readonly registrationCloseDate: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="bg-white/3 flex flex-col gap-5 border border-light-gold/20 p-8"
    >
      <FontAwesomeIcon
        icon={faCalendarCheck}
        className="text-2xl text-light-gold/50"
      />
      <div className="flex flex-col gap-3">
        <InfoLine label="Inscrições abertas" value={registrationOpenDate} />
        <InfoLine label="Fecho das inscrições" value={registrationCloseDate} />
        <InfoLine
          label="Pagamento até"
          value={formatPaymentDeadline(registrationConfig.paymentDeadlineDate)}
        />
      </div>
    </motion.div>
  );
}

function InfoLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-white/35 font-gala text-[0.6rem] font-bold uppercase tracking-widest">
        {label}
      </span>
      <span className="font-gala text-sm font-semibold text-white/70">
        {value || "A anunciar"}
      </span>
    </div>
  );
}
