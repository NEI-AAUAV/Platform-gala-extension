import VoteCard from "@/components/VoteCard";
import useVotes from "@/hooks/voteHooks/useVotes";

export default function Nominate() {
  const { votes } = useVotes();
  const nominationCategories = votes.filter((v) => v.nomination_open);

  return (
    <div>
      <h2 className="pt-20 text-center text-[3rem] font-bold sm:text-[4rem]">
        <span className="block font-gala text-light-gold">Nomeações</span>
      </h2>

      <div className="mx-4 mt-10 grid gap-8">
        {nominationCategories.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/30">
            Não há categorias de nomeação abertas.
          </p>
        ) : (
          nominationCategories.map((vote) => (
            <VoteCard key={vote._id} vote={vote} />
          ))
        )}
      </div>
    </div>
  );
}
