type Table = {
  _id: number;
  name: string | null;
  head: number | null;
  seats: number;
  persons: Person[];
  photo_url?: string | null;
  invite_token?: string | null;
};
