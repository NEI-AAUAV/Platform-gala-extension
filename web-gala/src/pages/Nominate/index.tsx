import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";

function NominateContent({
  categories,
  isRegistered,
}: Readonly<{ categories: Vote[]; isRegistered: boolean }>) {
  if (!isRegistered) {
    return (
      <p className="border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm text-white/50">
        Tens de estar inscrito no Gala para participar nas nomeações.
      </p>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="border border-light-gold/20 bg-black/25 px-6 py-10 text-center font-gala text-sm text-white/50">
        Não há categorias de nomeação abertas.
      </p>
    );
  }
  return (
    <>
      {categories.map((vote) => (
        <VoteCard key={vote._id} vote={vote} />
      ))}
    </>
  );
}

export default function Nominate() {
  const { state } = useSessionUser();
  const { votes } = useVotes();
  const nominationCategories = votes.filter((v) => v.nomination_open);

  return (
    <div className="px-4 pb-16 pt-16 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-5xl text-center">
        <p className="font-gala text-[0.68rem] font-bold uppercase tracking-[0.35em] text-light-gold/60">
          Gala Awards
        </p>
        <h2 className="mt-3 font-gala text-[2.4rem] font-bold leading-tight text-white sm:text-[3.6rem]">
          Nomeações
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-gala text-sm text-white/55 sm:text-base">
          Indica colegas para cada categoria.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:mt-12 lg:grid-cols-2">
        <NominateContent
          categories={nominationCategories}
          isRegistered={state === State.REGISTERED}
        />
      </div>
    </div>
  );
}
