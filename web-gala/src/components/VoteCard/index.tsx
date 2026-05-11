import Option from "./Option";
import NominationInput from "./NominationInput";

export type Props = Readonly<{
  vote: Vote;
}>;

export default function VoteCard({ vote }: Props) {
  const showNomination = vote.nomination_open;
  const showVoting = vote.voting_open && vote.options.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dark-gold bg-black/20 p-4 backdrop-blur-md">
      <div className="text-center">
        <h1 className="font-gala text-2xl font-semibold text-white">
          {vote.category}
        </h1>
        {showNomination && !vote.already_nominated && (
          <p className="mt-1 text-xs text-white/40">Sugere quem merece</p>
        )}
      </div>

      {showNomination && (
        <NominationInput
          categoryId={vote._id}
          alreadyNominated={vote.already_nominated}
        />
      )}

      {showVoting && (
        <div className="flex flex-col gap-4">
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
        <p className="py-2 text-center text-xs text-white/25">
          Esta categoria ainda não está aberta.
        </p>
      )}
    </div>
  );
}
