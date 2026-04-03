type Vote = {
  _id: number;
  category: string;
  options: string[];
  photo_paths: string[];
  scores: number[];
  already_voted: number | null;
};
