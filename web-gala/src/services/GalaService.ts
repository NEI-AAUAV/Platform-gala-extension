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
  has_payed: boolean;
};

type CreateUser = {
  nmec: number | null;
  matriculation: number | null;
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
  },
  user: {
    listUsers: async () => {
      const response: User[] = await client.get("/users");
      return response;
    },
    editUser: async (request: EditUser) => {
      const response: User = await client.put(`/users`, request);
      return response;
    },
    createUser: async (request: CreateUser) => {
      const response: User = await client.post(`/users`, request);
      return response;
    },
    getSessionUser: async () => {
      const response: User = await client.get("/users/me");
      return response;
    },
  },
  time: {
    getTimeSlots: async () => {
      const response: TimeSlots = await client.get(`/slots`);
      return response;
    },
    editTimeSlots: async (request: EditTimeSlots) => {
      const response: TimeSlots = await client.put(`/slots`, request);
      return response;
    },
  },
  limits: {
    getLimits: async () => {
      const response: Limits = await client.get(`/limits`);
      return response;
    },
    editTimeSlots: async (request: EditLimits) => {
      const response: Limits = await client.put(`/limits`, request);
      return response;
    },
  },
  vote: {
    listCategories: async () => {
      const response: Vote[] = await client.get("/votes/list");
      return response;
    },
    getCategory: async (id: string | number) => {
      const response: Vote = await client.get(`/votes/${id}`);
      return response;
    },
    createCategory: async (request: VoteCategoryCreate) => {
      const response: Vote = await client.post("/votes/new", request);
      return response;
    },
    editVote: async (id: string | number, request: VoteCategoryEdit) => {
      const response: Vote = await client.put(`/votes/${id}/edit`, request);
      return response;
    },
    castVote: async (id: string | number, request: VoteCategoryCast) => {
      const response: Vote = await client.put(`/votes/${id}/cast`, request);
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
        `/votes/${categoryId}/options/${optionIndex}/photo`,
        formData,
      );
      return response;
    },
    deleteCategory: async (id: string | number) => {
      const response = await client.delete(`/votes/${id}`);
      return response;
    },
    deleteOptionPhoto: async (
      categoryId: string | number,
      optionIndex: number,
    ) => {
      const response = await client.delete(
        `/votes/${categoryId}/options/${optionIndex}/photo`,
      );
      return response;
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
