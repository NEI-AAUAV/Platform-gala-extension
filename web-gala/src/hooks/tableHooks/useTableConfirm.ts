import GalaService from "@/services/GalaService";

type Confirmation = {
  uid: number;
  confirm: boolean;
};

export default async function tableConfirm(
  id: string | number,
  request: Confirmation,
) {
  await GalaService.table.confirmTable(id, request);
}
