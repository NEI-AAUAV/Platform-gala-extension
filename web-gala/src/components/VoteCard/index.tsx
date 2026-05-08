import Option from "./Option";

export type Props = Readonly<{
  vote: Vote;
}>;

export default function VoteCard({ vote }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dark-gold bg-black/20 p-4 backdrop-blur-md">
      <div
        id="header"
        className="text-base-200 flex flex-row items-center gap-3"
      >
        <div id="title" className="flex-1 text-center">
          <h2 className="font-gala text-sm font-light text-neutral-400">
            O mais...
          </h2>
          <h1 className="font-gala text-2xl font-semibold">{vote.category}</h1>
        </div>
      </div>

      <div id="options" className="flex flex-col gap-4">
        {vote.options.map((option, i) => {
          return (
            <Option
              key={option}
              name={option}
              photo_path={vote.photo_paths[i]}
              optionIdx={i}
              disabled={vote.already_voted !== null}
              catId={vote._id}
            />
          );
        })}
      </div>
    </div>
  );
}
