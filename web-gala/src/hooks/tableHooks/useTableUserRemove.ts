import GalaService from "@/services/GalaService";

export default async function tableUserRemove(
  id: number,
  uid: number | string,
) {
  await GalaService.table.tableRemoveUser(id, uid);
}
