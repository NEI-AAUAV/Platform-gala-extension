import GalaService from "@/services/GalaService";

export default async function tableReserve(id: number) {
  await GalaService.table.reserveTable(id);
}
