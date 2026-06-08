import {
  faCircleCheck,
  faIdCard,
  faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import GuideModal, { GuideRule } from "./GuideModal";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function NominationGuideModal({ isOpen, onClose }: Props) {
  const rules: GuideRule[] = [
    {
      icon: faIdCard,
      title: "Escreve o nome corretamente",
      description:
        "Usa primeiro e último nome (ex: Joao Silva). Evita alcunhas, iniciais ou nomes incompletos. Não te esqueças de dar Enter no final de cada nome para registar a nomeação!",
    },
    {
      icon: faListCheck,
      title: "Respeita os limites da categoria",
      description:
        "Cada categoria mostra o número mínimo e máximo de nomeados permitidos.",
    },
    {
      icon: faCircleCheck,
      title: "Confirma antes de enviar",
      description:
        "Podes preencher varias categorias e submeter todas de uma vez no final da pagina.",
    },
  ];

  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Como funcionam as nomeações?"
      rules={rules}
      footer="Fecha este guia e começa a nomear"
    />
  );
}
