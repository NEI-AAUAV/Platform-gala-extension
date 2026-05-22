type Vote = {
  _id: number;
  category: string;
  description?: string;
  options: string[];
  photo_paths: string[];
  scores: number[];
  already_voted: number | null;
  nomination_open: bool;
  voting_open: bool;
  already_nominated: boolean;
  min_nominees: number;
  max_nominees: number;
};
