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
  options: string[];
  photo_paths: string[];
};

export type VoteCategoryEdit = Partial<Omit<VoteCategoryCreate, "photo_paths">>;

type VoteCategoryCast = {
  option: number;
};

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
    createTable: async (request: { seats: number }) => {
      const response: Table = await client.post("/table/new", request);
      return response;
    },
    editTable: async (id: string | number, request: { name: string }) => {
      const response: Table = await client.put(`/table/${id}/edit`, request);
      return response;
    },
    reserveTable: async (id: string | number, request: ReserveTable) => {
      const response: Table = await client.post(`/table/${id}/reserve`, request);
      return response;
    },
    confirmTable: async (id: string | number, request: Confirmation) => {
      const response: Table = await client.patch(`/table/${id}/confirm`, request);
      return response;
    },
    tableTransfer: async (id: string | number, request: { uid: number }) => {
      const response: Table = await client.patch(`/table/${id}/transfer`, request);
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
      const response: Vote[] = await client.get("/voting/list");
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
      const response: Vote = await client.put(`/voting/${id}/cast`, request);
      return response;
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
      return client.delete(`/voting/${categoryId}/options/${optionIndex}/photo`);
    },
  },

  registration: {
    getStatus: async (): Promise<User> => {
      return client.get("/registration/status");
    },
    updateStep: async (step: number, data: Record<string, unknown>): Promise<User> => {
      return client.post(`/registration/step/${step}`, data);
    },
    uploadPaymentProof: async (file: File, phase: 1 | 2 = 1): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      return client.post(`/registration/payment-proof?phase=${phase}`, formData);
    },
  },

  config: {
    getConfig: async (): Promise<Record<string, unknown>> => {
      return client.get("/config");
    },
    updateConfig: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
      return client.put("/admin/config", data);
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
      return client.patch(`/admin/registrations/${userId}/bus`, { bus_id: busId });
    },
    autoAssignBuses: async (strategy: "year" | "order"): Promise<{ assigned: number }> => {
      return client.post("/admin/buses/auto-assign", { strategy });
    },
  },
};

export default GalaService;
