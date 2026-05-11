import GalaService from "@/services/GalaService";

export default async function tableLeave(id: string | number) {
  await GalaService.table.tableLeave(id);
}
