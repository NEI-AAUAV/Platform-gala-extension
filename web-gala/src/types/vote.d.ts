type Vote = {
  _id: number;
  category: string;
  options: string[];
  photo_paths: string[];
  scores: number[];
  already_voted: number | null;
  nomination_open: boolean;
  voting_open: boolean;
  already_nominated: boolean;
};
