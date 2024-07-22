import { Link } from "@nextui-org/link";
import { button as buttonStyles } from "@nextui-org/theme";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { Search } from "@/components/search";

export default function IndexPage() {
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
							color: "default",
							radius: "full",
							variant: "shadow",
						})}
					>
						<GithubIcon size={20} />
						GitHub
					</Link>
				</div>

				<div className="mt-8">
					<Search />
				</div>
			</section>
		</DefaultLayout>
	);
}
