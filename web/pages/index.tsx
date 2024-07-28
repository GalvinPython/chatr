import { Link } from "@nextui-org/link";
import { button as buttonStyles } from "@nextui-org/theme";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { Search } from "@/components/search";
import { Component } from "react";

interface PageState {
	success: boolean;
	totalGuilds: number;
	totalMembers: number;
	trackedUsers: number;
}

interface PageProps {
	success: boolean;
	data: {
		total_guilds: number;
		total_members: number;
		user_count: number;
	};
}

class IndexPage extends Component<object, PageState, PageProps> {
	
	constructor(props: PageProps) {
		super(props);
		this.state = {
			success: false,
			totalGuilds: props.data.total_guilds,
			totalMembers: props.data.total_members,
			trackedUsers: props.data.user_count,
		};
	}

	render() {
		return (
			<DefaultLayout>
				<section className="flex flex-col items-center justify-center gap-4 py-8">
					<div className="inline-block max-w-lg text-center justify-center">
						<h1 className={title({ color: "violet" })}>Chatr</h1>
						<h1 className={title()}>.fun</h1>
						<h4 className={subtitle({ class: "mt-4" })}>
							A next generation Discord XP bot.
						</h4>
						<p>chatr.fun is not affiliated with Discord</p>
					</div>

					<div className="flex gap-3">
						<Link
							isExternal
							href={siteConfig.links.github}
							className={buttonStyles({
								color: "secondary",
								radius: "full",
								variant: "shadow",
							})}
						>
							<GithubIcon size={20} />
							GitHub
						</Link>
					</div>

					<div className="mt-4">
						<Search />
					</div>

					<div className="mt-4 inline-block max-w-lg text-center justify-center">
						<h1 className={title({ color: "violet" })}>Statistics</h1>
						<h4 className={subtitle({ class: "mt-4" })}>
							Total Guilds: {this.state.totalGuilds}
						</h4>
						<h4 className={subtitle({ class: "mt-4" })}>
							Total Members: {this.state.totalMembers}
						</h4>
						<h4 className={subtitle({ class: "mt-4" })}>
							Tracked Users: {this.state.trackedUsers}
						</h4>
					</div>
				</section>
			</DefaultLayout>
		);
	}
}

export async function getServerSideProps() {
	try {
		const res = await fetch("http://localhost:18103/get/botinfo");

		if (res.ok) {
			return {
				props: {
					success: true,
					data: await res.json(),
				},
			};
		} else {
			return {
				props: {
					success: false,
					data: null,
				},
			};
		}
	} catch (error) {
		console.error(error);
		return {
			props: {
				success: false,
				data: null,
			},
		};
	}
}

export default IndexPage;