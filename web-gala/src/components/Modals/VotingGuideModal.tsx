import {
  faCheckToSlot,
  faCircleCheck,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import GuideModal, { GuideRule } from "./GuideModal";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function VotingGuideModal({ isOpen, onClose }: Props) {
  const rules: GuideRule[] = [
    {
      icon: faCheckToSlot,
      title: "Seleciona com cuidado",
      description:
        "Escolhe o candidato que consideras que mais se destacou em cada categoria.",
    },
    {
      icon: faLock,
      title: "Submissão única e final",
      description:
        "Uma vez submetidos, os teus votos são guardados e não poderão ser alterados. Revê tudo antes de confirmar.",
    },
    {
      icon: faCircleCheck,
      title: "Confirmação no final",
      description:
        "Podes selecionar os teus candidatos favoritos ao longo da página e, no fim, enviar todos os votos de uma só vez.",
    },
  ];

  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Como funcionam as votações?"
      rules={rules}
      footer="Fecha este guia e começa a votar"
    />
  );
}
