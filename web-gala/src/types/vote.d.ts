type Vote = {
  _id: number;
  category: string;
  description?: string;
  options: string[];
  photo_paths: string[];
  scores: number[];
  already_voted: number | null;
  nomination_open: boolean;
  voting_open: boolean;
  already_nominated: boolean;
  min_nominees: number;
  max_nominees: number;
  reveal_at?: string;
  revealed: boolean;
  is_hidden: boolean;
  results_visible: boolean;
};
