import config from "@/config";
import { createClient } from "./client";

const client = createClient(`${config.BASE_URL}/api/gala/v1`);

type ReserveTable = {
  dish: string;
  allergies: string;
  companions: {
    dish: string;
    allergies: string;
  }[];
};

type Confirmation = {
  uid: number;
  confirm: boolean;
};

type EditUser = {
  id: number;
  has_payed?: boolean;
  [key: string]: unknown;
};

type EditTimeSlots = {
  registrationStart?: string;
  registrationEnd?: string;
  nominationsStart?: string;
  nominationsEnd?: string;
  votesStart?: string;
  votesEnd?: string;
  tablesStart?: string;
  tablesEnd?: string;
  galaStart?: string;
};

export type Limits = {
  maxRegistrations: number;
  maxBusSeats: number;
  maxTablesCount: number;
};

export type EditLimits = Partial<Limits>;

type VoteCategoryCreate = {
  category: string;
  description?: string;
  min_nominees?: number;
  max_nominees?: number;
  options: string[];
  photo_paths: string[];
  reveal_at?: string | null;
  is_hidden?: boolean;
};

export type VoteCategoryEdit = Partial<Omit<VoteCategoryCreate, "photo_paths">>;

export type AdminNominee = {
  name: string;
  votes: number[];
};

export type AdminVoteCategory = {
  _id: number;
  category: string;
  description?: string;
  min_nominees: number;
  max_nominees: number;
  nominations: AdminNominee[];
  options: string[];
  photo_paths: string[];
  votes: { uid: number; option: number }[];
  reveal_at?: string;
  revealed?: boolean;
  is_hidden: boolean;
};

export type MergeNomineesBody = {
  target_name: string;
  source_names: string[];
};

export type ManagerPermissionKey =
  | "registration"
  | "tables"
  | "categories"
  | "homepage"
  | "buses";

export type ManagerPermissionsResponse = {
  is_admin: boolean;
  permissions: ManagerPermissionKey[];
};

export type Manager = {
  _id: number;
  name: string;
  email: string;
  permissions: ManagerPermissionKey[];
};

type VoteCategoryCast = {
  option: number;
};

export type AdminCompanionInput = {
  name: string;
  email: string;
  dish?: string;
  allergies?: string;
};

export type AdminCreateRegistrationBody = {
  authentik_user_id?: number;
  name?: string;
  email?: string;
  nmec?: number;
  matriculation?: number;
  phone?: string;
  bus_option?: string;
  meal_option?: string;
  food_allergies?: string;
  phased_payment?: boolean;
  companions?: AdminCompanionInput[];
};

export type AdminEditRegistrationBody = {
  name?: string;
  email?: string;
  nmec?: number;
  matriculation?: number | null;
  phone?: string;
  bus_option?: string;
  meal_option?: string;
  food_allergies?: string;
  phased_payment?: boolean;
  has_payed?: boolean;
  companions?: AdminCompanionInput[];
};

export type AuthentikUserResult = { id: number; name: string; email: string };

const GalaService = {
  table: {
    listTables: async () => {
      const response: Table[] = await client.get("/table/list");
      return response;
    },
    listTablesPublic: async () => {
      const response: Table[] = await client.get("/table/list/public");
      return response;
    },
    getTable: async (id: string | number) => {
      const response: Table = await client.get(`/table/${id}`);
      return response;
    },
    createTable: async (request: { name: string; seats?: number }) => {
      const response: Table = await client.post("/table/create", request);
      return response;
    },
    editTable: async (
      id: string | number,
      request: { name: string; seats?: number },
    ) => {
      const response: Table = await client.put(`/table/${id}/edit`, request);
      return response;
    },
    reserveTable: async (id: string | number, request: ReserveTable) => {
      const response: Table = await client.post(
        `/table/${id}/reserve`,
        request,
      );
      return response;
    },
    confirmTable: async (id: string | number, request: Confirmation) => {
      const response: Table = await client.patch(
        `/table/${id}/confirm`,
        request,
      );
      return response;
    },
    tableTransfer: async (id: string | number, request: { uid: number }) => {
      const response: Table = await client.patch(
        `/table/${id}/transfer`,
        request,
      );
      return response;
    },
    tableLeave: async (id: string | number) => {
      const response: Table = await client.delete(`/table/${id}/leave`);
      return response;
    },
    tableRemoveUser: async (id: string | number, uid: string | number) => {
      const response: Table = await client.delete(`/table/${id}/remove/${uid}`);
      return response;
    },
    uploadPhoto: async (
      tableId: number,
      file: File,
    ): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      return client.post(`/table/${tableId}/photo`, formData);
    },
    inviteUser: async (tableId: number, userId: number) => {
      const response: Table = await client.post(
        `/table/${tableId}/invite/${userId}`,
        {},
      );
      return response;
    },
    revokeInvite: async (tableId: number, userId: number) => {
      const response: Table = await client.delete(
        `/table/${tableId}/invite/${userId}`,
      );
      return response;
    },
    getMyInvites: async (): Promise<Table[]> => {
      return client.get("/table/my-invites");
    },
    acceptInvite: async (
      tableId: number,
      body: { dish?: string; allergies?: string },
    ) => {
      const response: Table = await client.post(
        `/table/${tableId}/invite/accept`,
        body,
      );
      return response;
    },
  },

  user: {
    listUsers: async () => {
      const response: User[] = await client.get("/user/");
      return response;
    },
    editUser: async (request: EditUser) => {
      const { id, ...updates } = request;
      const response: User = await client.put("/user/", { id, ...updates });
      return response;
    },
    getSessionUser: async () => {
      const response: User = await client.get("/user/me");
      return response;
    },
    getMyTable: async () => {
      return client.get("/user/me/table");
    },
    searchUsers: async (
      q: string,
    ): Promise<
      { id: number; name: string; email: string; is_registered: boolean }[]
    > => {
      return client.get(`/user/search?q=${encodeURIComponent(q)}`);
    },
  },

  admin: {
    listRegistrations: async (): Promise<User[]> => {
      return client.get("/admin/registrations");
    },
    getRegistration: async (userId: number): Promise<User> => {
      return client.get(`/admin/registrations/${userId}`);
    },
    confirmPayment: async (userId: number, phase?: number): Promise<void> => {
      const suffix = phase ? `?phase=${phase}` : "";
      return client.post(
        `/admin/registrations/${userId}/confirm_payment${suffix}`,
        {},
      );
    },
    unconfirmPayment: async (userId: number, phase?: number): Promise<void> => {
      const suffix = phase ? `?phase=${phase}` : "";
      return client.delete(
        `/admin/registrations/${userId}/confirm_payment${suffix}`,
      );
    },
    sendPaymentReminder: async (userId: number): Promise<void> => {
      return client.post(`/admin/registrations/${userId}/payment-reminder`, {});
    },
    updateRegistration: async (
      userId: number,
      updates: Partial<User>,
    ): Promise<void> => {
      return client.patch(`/admin/registrations/${userId}`, updates);
    },
    createRegistration: async (
      body: AdminCreateRegistrationBody,
    ): Promise<User> => {
      return client.post("/admin/registrations", body);
    },
    editRegistration: async (
      userId: number,
      body: AdminEditRegistrationBody,
    ): Promise<User> => {
      return client.put(`/admin/registrations/${userId}`, body);
    },
    deleteRegistration: async (userId: number): Promise<void> => {
      return client.delete(`/admin/registrations/${userId}`);
    },
    listAuthentikUsers: async (
      query?: string,
    ): Promise<AuthentikUserResult[]> => {
      const url = query
        ? `/admin/authentik/users?query=${encodeURIComponent(query)}`
        : "/admin/authentik/users";
      return client.get(url);
    },
    rejectPaymentProof: async (
      userId: number,
      phase: number,
    ): Promise<void> => {
      return client.delete(
        `/admin/registrations/${userId}/payment-proof?phase=${phase}`,
      );
    },
    uploadPaymentProof: async (
      userId: number,
      phase: number,
      file: File,
    ): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      return client.post(
        `/admin/registrations/${userId}/payment-proof?phase=${phase}`,
        formData,
      );
    },

    // Table Management
    createTable: async (request: {
      name: string;
      seats: number;
    }): Promise<Table> => {
      return client.post(
        `/admin/tables/create?name=${encodeURIComponent(request.name)}&seats=${
          request.seats
        }`,
        {},
      );
    },
    deleteTable: async (tableId: number): Promise<void> => {
      return client.delete(`/admin/tables/${tableId}`);
    },
    addMemberToTable: async (
      tableId: number,
      userId: number,
    ): Promise<Table> => {
      return client.post(`/admin/tables/${tableId}/members/${userId}`, {});
    },
    moveMemberToTable: async (
      tableId: number,
      userId: number,
    ): Promise<Table> => {
      return client.post(`/admin/tables/${tableId}/members/${userId}/move`, {});
    },
    removeMemberFromTable: async (
      tableId: number,
      userId: number,
    ): Promise<void> => {
      return client.delete(`/admin/tables/${tableId}/members/${userId}`);
    },

    // Voting category management
    listVotingCategories: async (): Promise<AdminVoteCategory[]> => {
      return client.get("/admin/voting/categories");
    },
    finalizeNominations: async (categoryId: number): Promise<void> => {
      return client.post(`/admin/voting/categories/${categoryId}/finalize`, {});
    },
    mergeNominees: async (
      categoryId: number,
      body: MergeNomineesBody,
    ): Promise<void> => {
      return client.post(`/admin/voting/categories/${categoryId}/merge`, body);
    },
    setResultsVisibility: async (visible: boolean): Promise<void> => {
      return client.patch(
        `/admin/voting/results-visibility?visible=${visible}`,
      );
    },
  },

  time: {
    getTimeSlots: async () => {
      const response: TimeSlots = await client.get("/time_slots/");
      return response;
    },
    editTimeSlots: async (request: EditTimeSlots) => {
      const response: TimeSlots = await client.patch("/admin/time", request);
      return response;
    },
  },

  limits: {
    getLimits: async () => {
      const response: Limits = await client.get("/limits");
      return response;
    },
    editLimits: async (request: EditLimits) => {
      const response: Limits = await client.put("/limits", request);
      return response;
    },
  },

  vote: {
    listCategories: async () => {
      const response: Vote[] = await client.get("/voting/categories");
      return response;
    },
    getCategory: async (id: string | number) => {
      const response: Vote = await client.get(`/voting/${id}`);
      return response;
    },
    createCategory: async (request: VoteCategoryCreate) => {
      const response: Vote = await client.post("/voting/new", request);
      return response;
    },
    editVote: async (id: string | number, request: VoteCategoryEdit) => {
      const response: Vote = await client.put(`/voting/${id}/edit`, request);
      return response;
    },
    castVote: async (id: string | number, request: VoteCategoryCast) => {
      const response: Vote = await client.post(
        `/voting/categories/${id}/vote`,
        request,
      );
      return response;
    },
    nominate: async (id: string | number, names: string[]): Promise<void> => {
      await client.post(`/voting/categories/${id}/nominate`, { names });
    },
    bulkNominate: async (
      items: { category_id: number; names: string[] }[],
    ): Promise<{
      status: string;
      errors?: { category_id: number; error: string }[];
    }> => {
      return client.post("/voting/bulk_nominate", { items });
    },
    getSuggestions: async (
      id: string | number,
      query: string,
    ): Promise<string[]> => {
      return client.get(
        `/voting/nominees/suggest?category_id=${id}&q=${encodeURIComponent(
          query,
        )}`,
      );
    },
    uploadOptionPhoto: async (
      categoryId: string | number,
      optionIndex: number,
      file: File,
    ) => {
      const formData = new FormData();
      formData.append("image", file);
      const response: Vote = await client.put(
        `/voting/${categoryId}/options/${optionIndex}/photo`,
        formData,
      );
      return response;
    },
    deleteCategory: async (id: string | number) => {
      return client.delete(`/voting/${id}`);
    },
    deleteOptionPhoto: async (
      categoryId: string | number,
      optionIndex: number,
    ) => {
      return client.delete(
        `/voting/${categoryId}/options/${optionIndex}/photo`,
      );
    },
  },

  registration: {
    getCapacity: async (): Promise<{ remaining: number; total: number }> => {
      return client.get("/registration/capacity");
    },
    getStatus: async (): Promise<User> => {
      return client.get("/registration/status");
    },
    updateStep: async (
      step: number,
      data: Record<string, unknown>,
    ): Promise<User> => {
      return client.post(`/registration/step/${step}`, data);
    },
    uploadPaymentProof: async (
      file: File,
      phase: 1 | 2 = 1,
    ): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      return client.post(
        `/registration/payment-proof?phase=${phase}`,
        formData,
      );
    },
  },

  config: {
    getConfig: async (): Promise<Record<string, unknown>> => {
      return client.get("/config");
    },
    updateConfig: async (
      data: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      return client.put("/admin/config", data);
    },
  },

  permissions: {
    getMyPermissions: async (): Promise<ManagerPermissionsResponse> => {
      return client.get("/admin/managers/me");
    },
    listManagers: async (): Promise<Manager[]> => {
      return client.get("/admin/managers");
    },
    setManagerPermissions: async (
      managerId: number,
      permissions: ManagerPermissionKey[],
      name: string,
      email: string,
    ): Promise<Manager> => {
      return client.put(`/admin/managers/${managerId}/permissions`, {
        permissions,
        name,
        email,
      });
    },
  },

  homepage: {
    uploadDJPhoto: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("image", file);
      return client.put("/admin/homepage/dj/photo", formData);
    },
    deleteDJPhoto: async (): Promise<void> => {
      return client.delete("/admin/homepage/dj/photo");
    },
    uploadGalleryPreview: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("image", file);
      return client.put("/admin/homepage/gallery/preview", formData);
    },
    assignBus: async (userId: number, busId: string | null): Promise<void> => {
      return client.patch(`/admin/registrations/${userId}/bus`, {
        bus_id: busId,
      });
    },
    autoAssignBuses: async (
      strategy: "year" | "order",
    ): Promise<{ assigned: number }> => {
      return client.post("/admin/buses/auto-assign", { strategy });
    },
  },
};

export default GalaService;
