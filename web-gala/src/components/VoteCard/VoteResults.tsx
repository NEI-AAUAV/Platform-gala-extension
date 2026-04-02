import React, { useEffect } from "react";
import GalaService from "@/services/GalaService";

function VoteResults() {
  const [data, setData] = React.useState<Vote[]>([]);

  useEffect(() => {
    // Function to fetch data
    const fetchData = () => {
      GalaService.vote
        .listCategories()
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          console.error(err);
        });
    };

    // Fetch data initially
    fetchData();

    // Set up interval to fetch data every 2.5 seconds
    const interval = setInterval(fetchData, 2500);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center py-20">
      <h1 className="mb-4 text-3xl font-bold text-dark-gold">Vote Results</h1>
      <table className="my-20 w-full overflow-hidden rounded-lg  text-center text-light-gold">
        <thead className="bg-dark-gold text-black">
          <tr>
            <th className="p-2">Category</th>
            <th className="p-2">Options</th>
            <th className="p-2">Results</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item._id}
              className="border-b border-dark-gold odd:bg-black/20 even:bg-black/10"
            >
              <td className="border-r border-dark-gold p-2">{item.category}</td>
              <td className="border-r border-dark-gold p-2">
                <ul className="divide-y divide-dark-gold">
                  {item.options.map((option) => (
                    <li key={option} className="py-1">
                      {option}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="p-2">
                <ul className="divide-y divide-dark-gold">
                  {item.scores.map((score, index) => (
                    <li key={`${item._id}-score-${index}`} className="py-1">
                      {score}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default VoteResults;
