import Option from "./Option";
import NominationInput from "./NominationInput";

export type Props = Readonly<{
  vote: Vote;
}>;

export default function VoteCard({ vote }: Props) {
  const showNomination = vote.nomination_open;
  const showVoting = vote.voting_open && vote.options.length > 0;

  return (
    <div className="relative overflow-hidden border border-light-gold/25 bg-gradient-to-br from-[#1a1713]/80 via-black/60 to-[#131313]/80 p-5 backdrop-blur-md sm:p-6">
      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-light-gold/10 blur-2xl" />

      <div className="relative text-center">
        <h1 className="font-gala text-2xl font-semibold text-white sm:text-[1.8rem]">
          {vote.category}
        </h1>
        {vote.description && (
          <p className="mt-2 font-gala text-xs italic text-white/40">
            {vote.description}
          </p>
        )}
        {showNomination && !vote.already_nominated && (
          <p className="mt-1 font-gala text-xs uppercase tracking-[0.2em] text-white/45">
            Sugere quem merece
          </p>
        )}
      </div>

      <div className="relative mt-4">{showNomination && (
        <NominationInput
          categoryId={vote._id}
          alreadyNominated={vote.already_nominated}
          minNominees={vote.min_nominees}
          maxNominees={vote.max_nominees}
        />

      )}</div>

      {showVoting && (
        <div className="mt-4 flex flex-col gap-4">
          {vote.options.map((option, i) => (
            <Option
              key={option}
              name={option}
              photo_path={vote.photo_paths[i]}
              optionIdx={i}
              disabled={vote.already_voted !== null}
              catId={vote._id}
            />
          ))}
        </div>
      )}

      {!showNomination && !showVoting && (
        <p className="py-2 text-center font-gala text-xs text-white/35">
          Esta categoria ainda não está aberta.
        </p>
      )}
    </div>
  );
}
