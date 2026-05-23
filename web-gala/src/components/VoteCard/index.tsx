import { useMemo } from "react";
import Option from "./Option";
import NominationInput from "./NominationInput";
import { getRandomizedVoteOptions } from "@/utils/randomizeVoteOptions";

export type Props = Readonly<{
  vote: Vote;
  nominationNames?: string[];
  onNominationNamesChange?: (names: string[]) => void;
  error?: string | null;
  submittedName?: string | null;
  onStartEditing?: () => void;
  isEditing?: boolean;
}>;

export default function VoteCard({
  vote,
  nominationNames = [],
  onNominationNamesChange = () => {},
  error,
  submittedName,
  onStartEditing = () => {},
  isEditing,
}: Props) {
  const showNomination = vote.nomination_open && vote.revealed;
  const showVoting = vote.revealed && vote.options.length > 0;
  const votingOptions = useMemo(() => getRandomizedVoteOptions(vote), [vote]);

  return (
    <article className="relative overflow-hidden border border-light-gold/25 bg-gradient-to-br from-[#1a1713]/90 via-black/70 to-[#131313]/95 p-5 backdrop-blur-md sm:p-6">
      <div className="bg-light-gold/15 pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-light-gold/10 blur-2xl" />

      <div className="relative text-center">
        <h1 className="font-gala text-2xl font-semibold text-white sm:text-[1.9rem]">
          {vote.category}
        </h1>
        {vote.description && (
          <p className="mt-2 font-gala text-sm italic text-white/50">
            {vote.description}
          </p>
        )}
        {vote.already_voted !== null && (
          <div className="mt-2.5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-gala text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Votado
            </span>
          </div>
        )}
        {showNomination && !(vote.already_nominated && !isEditing) && (
          <p className="text-white/45 mt-1 font-gala text-xs uppercase tracking-[0.2em]">
            Sugere quem merece
          </p>
        )}
      </div>

      <div className="relative mt-4">
        {showNomination && (
          <NominationInput
            categoryId={vote._id}
            alreadyNominated={vote.already_nominated && !isEditing}
            minNominees={vote.min_nominees}
            maxNominees={vote.max_nominees}
            names={nominationNames}
            onNamesChange={onNominationNamesChange}
            error={error}
            submittedName={submittedName}
            onStartEditing={onStartEditing}
          />
        )}
      </div>

      {showVoting && (
        <div className="mt-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {votingOptions.map((option) => (
              <Option
                key={`${vote._id}-${option.name}-${option.originalIndex}`}
                name={option.name}
                photo_path={option.photoPath}
                optionIdx={option.originalIndex}
                disabled={!vote.voting_open || vote.already_voted !== null}
                catId={vote._id}
              />
            ))}
          </div>
          {!vote.voting_open && (
            <p className="text-white/35 mt-4 text-center font-gala text-[0.68rem] font-bold uppercase tracking-[0.2em]">
              Votações Abrem Brevemente
            </p>
          )}
        </div>
      )}

      {!vote.revealed && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-light-gold/30 bg-black/30 py-8 px-4 text-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-light-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-light-gold" />
          </span>
          <p className="mt-3 font-gala text-sm font-semibold text-light-gold">
            A Revelar em Breve...
          </p>
          {vote.reveal_at && (
            <p className="mt-1.5 font-gala text-xs text-white/40">
              Nomeados conhecidos a {new Date(vote.reveal_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {!showNomination && !showVoting && vote.revealed && (
        <p className="text-white/35 py-2 text-center font-gala text-xs">
          Esta categoria ainda não está aberta.
        </p>
      )}
    </article>
  );
}
