import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";
import useSessionUser, { State } from "@/hooks/userHooks/useSessionUser";

function NominateContent({
  categories,
  isRegistered,
}: Readonly<{ categories: Vote[]; isRegistered: boolean }>) {
  if (!isRegistered) {
    return (
      <p className="py-10 text-center text-sm text-white/30">
        Tens de estar inscrito no Gala para participar nas nomeações.
      </p>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-white/30">
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
    <div>
      <h2 className="pt-20 text-center text-[3rem] font-bold sm:text-[4rem]">
        <span className="block font-gala text-light-gold">Nomeações</span>
      </h2>

      <div className="mx-4 mt-10 grid gap-8">
        <NominateContent
          categories={nominationCategories}
          isRegistered={state === State.REGISTERED}
        />
      </div>
    </div>
  );
}
