import { useState } from 'react';
import { useRouter } from 'next/router';
import { subtitle } from "@/components/primitives";

export const Search = () => {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');

	const handleSearch = () => {
		if (searchQuery.trim() !== '') {
			router.push(`/leaderboard/${searchQuery}`);
		}
	};

	const handleInputChange = (event: any) => {
		setSearchQuery(event.target.value);
	};

	return (
		<div className="w-min-full">
			<div className="flex flex-col">
				<input
					type="text"
					value={searchQuery}
					onChange={handleInputChange}
					placeholder="Enter guild ID"
					className="border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring focus:ring-violet-200 w-full text-lg"
				/>

				<button
					onClick={handleSearch}
					className="bg-[#111] hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-lg transform hover:scale-105 transition-transform border border-violet-500 w-full mt-2"
				>
					<h3 className={subtitle()}>Go</h3>
				</button>
			</div>
		</div>
	);
}