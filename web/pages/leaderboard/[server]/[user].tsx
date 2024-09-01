import React, { Component } from 'react';
import DefaultLayout from "@/layouts/default";
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import dynamic from "next/dynamic";
import Image from 'next/image';
import "odometer/themes/odometer-theme-default.css";
import { ChartOptions, ChartPointsFormatted } from '@/types/chart';
import { PropsUsers } from '@/types/props';

const Odometer = dynamic(import('react-odometerjs'), {
	ssr: false,
});

interface PageState {
	urlToFetch: string;
	isLoading: boolean;
	discordAccountExists: boolean;
	discordUserId: string;
	discordGuildId: string;
	discordAvatarURL: string;
	// discordBannerURL: string; (we do not have, but maybe in the future)
	discordUsername: string;
	discordDisplayName: string;
	odometerPoints: number;
	odometerLevel: number;
	odometerPointsNeededToNextLevel: number;
	odometerPointsNeededForNextLevel: number;
	odometerProgressToNextLevelPercentage: number;
	chartOptions: ChartOptions;
}

class IndexPage extends Component<object, PageState> {

	interval: Timer | null = null

	constructor(props: PropsUsers) {
		super(props);

		this.state = {
			urlToFetch: process.env.NODE_ENV === 'development' ? 'http://localhost:18103' : 'https://api.chatr.fun',
			isLoading: true, // Flag to indicate whether a request is in progress
			discordAccountExists: props.discordAccountExists,
			discordUserId: props.discordUserId,
			discordGuildId: props.discordGuildId,
			discordAvatarURL: props.discordAvatarURL,
			discordUsername: props.discordUsername,
			discordDisplayName: props.discordDisplayName,
			odometerPoints: props.odometerPoints,
			odometerLevel: props.odometerLevel,
			odometerPointsNeededToNextLevel: props.odometerPointsNeededToNextLevel,
			odometerPointsNeededForNextLevel: props.odometerPointsNeededForNextLevel,
			odometerProgressToNextLevelPercentage: props.odometerProgressToNextLevelPercentage,
			chartOptions: {
				chart: {
					backgroundColor: 'transparent',
					type: "line",
					zoomType: 'x'
				},
				title: {
					text: "XP",
					style: {
						color: 'gray',
						font: "Roboto Medium"
					}
				},
				xAxis: {
					type: 'datetime',
					tickPixelInterval: 150,
					labels: {
						style: {
							color: 'gray',
							font: "Roboto Medium"
						}
					},
					visible: true
				},
				yAxis: {
					gridLineColor: "gray",
					title: {
						text: ''
					},
					labels: {
						style: {
							color: 'gray',
							font: "Roboto Medium"
						}
					},
					visible: true
				},
				plotOptions: {
					series: {
						threshold: null,
						fillOpacity: 0.25,
						animation: false,
						lineWidth: 3
					},
					area: {
						fillOpacity: 0.25
					},
				},
				credits: {
					enabled: true,
					text: "chatr.fun",
					href: '#uwu'
				},
				time: {
					useUTC: false
				},
				tooltip: {
					shared: true,
					formatter(this: ChartPointsFormatted) {
						if (!this.points || this.points.length === 0) return '';

						const point = this.points[0];

						const index = point.series.xData.indexOf(point.x);
						const lastY = point.series.yData[index - 1];
						const dif = point.y - lastY;

						let r = Highcharts.dateFormat('%A %b %e, %H:%M:%S', new Date(point.x).getTime()) +
							'<br><span style="color:black">\u25CF </span>' +
							point.series.name + ': <b>' + Number(point.y).toLocaleString();

						if (dif < 0) {
							r += '<span style="color:#ff0000;font-weight:bold;"> (' +
								Number(dif).toLocaleString() + ')</span>';
						}
						if (dif > 0) {
							r += '<span style="color:#00bb00;font-weight:bold;"> (+' +
								Number(dif).toLocaleString() + ')</span>';
						}

						return r;
					}
				},
				series: [{
					name: 'Total XP',
					data: [],
					showInLegend: false,
					marker: { enabled: false },
					color: '#FFF',
					lineColor: '#4093f1',
					lineWidth: 4
				}]
			},
		};
	}

	fetchData = () => {
		console.log(this.state);
		if (this.state.discordUserId == null) {
			return;
		} else {
			fetch(`${this.state.urlToFetch}/get/${this.state.discordGuildId}/${this.state.discordUserId}`)
				.then(response => response.json())
				.then(data => {
					const points = data.xp;

					// Update the chart data
					this.setState(prevState => {
						const newDataPoint = [Date.now(), points];
						const updatedData = [...prevState.chartOptions.series[0].data, newDataPoint];

						if (updatedData.length > 1800) {
							updatedData.shift();
						}
						if (updatedData.length == 2) {
							console.log(updatedData[1])
							if (updatedData[1][0] < (updatedData[0][0] + 1000)) {
								updatedData.shift()
							}
						}

						return {
							odometerPoints: points,
							odometerPointsNeededToNextLevel: data.xp_needed_next_level,
							odometerPointsNeededForNextLevel: points + data.xp_needed_next_level,
							odometerProgressToNextLevelPercentage: data.progress_next_level,
							odometerLevel: data.level,
							chartOptions: {
								...prevState.chartOptions,
								series: [{
									...prevState.chartOptions.series[0],
									data: updatedData as [number, number][],
								}],
							},
							isLoading: false, // Reset isLoading flag
						};
					});
				})
				.catch(error => {
					console.log(error);
					this.setState({ isLoading: false }); // Reset isLoading flag
				});
		}
	};

	componentDidMount() {
		this.fetchData(); // Fetch initial data when component mounts

		// Make the updating interval 5 seconds to prevent overloading the server and duplicate responses
        this.interval = setInterval(this.fetchData, 5000);
	}

	componentWillUnmount() {
		if (this.interval) {
			clearInterval(this.interval); // Clear interval when component unmounts
		}
	}


	render() {
		const { discordAccountExists, odometerPoints, odometerPointsNeededToNextLevel, odometerPointsNeededForNextLevel, odometerProgressToNextLevelPercentage, odometerLevel, chartOptions } = this.state;

		if (!discordAccountExists) {
			// Redirect to 404
			if (typeof window != 'undefined') {
				window.location.href = '/404';
			}
			return null;
		}

		return (
			<DefaultLayout>
				<section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 max-w-[90%] ml-auto mr-auto">
					<div className="relative w-full p-4 rounded-lg flex flex-col justify-center items-center">
						{/* <Image
							src={this.state.discordBannerURL}
							alt="Banner"
							className="absolute inset-0 w-full h-full object-cover rounded-lg z-0 blur-sm"
							width={1500}
							height={500}
						/> */}
						<div className="relative z-10 flex items-center bg-gray-900 p-6 rounded-full bg-opacity-90">
							<Image
								src={this.state.discordAvatarURL}
								alt="User Avatar"
								className="w-20 h-20 rounded-full mr-4 opacity-100 border-blue-500 border-4"
								width={174}
								height={174}
							/>
							<div>
								<h2 className="text-white text-lg font-semibold opacity-100" style={{ fontSize: "32px" }}>{this.state.discordDisplayName}</h2>
								<p className="text-gray-500 opacity-100" style={{ fontSize: "16px" }}>{this.state.discordUsername}</p>
							</div>
						</div>
					</div>

					<div className="w-full bg-gray-800 p-4 rounded-lg flex flex-col justify-center items-center">
						<div className='text-6xl sm:text-7xl md:text-8xl lg:text-9xl'>
							<Odometer value={odometerPoints} />
						</div>
						<div className="text-gray-400 mt-2 center-text">XP</div>
					</div>

					<div className="grid grid-cols-4 gap-4 w-full">
						<div className="bg-gray-800 p-2 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105">
							<div className='text-xl sm:text-xl md:text-2xl lg:text-2xl'>
								<Odometer value={odometerPointsNeededToNextLevel} />
							</div>
							<div className="text-gray-400 mt-2 center-text">Points To Next Level</div>
						</div>
						<div className="bg-gray-800 p-2 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105">
							<div className='text-xl sm:text-xl md:text-2xl lg:text-2xl'>
								<Odometer value={odometerPointsNeededForNextLevel} />
							</div>
							<div className="text-gray-400 mt-2 center-text">Points For Next Level</div>
						</div>
						<div className="bg-gray-800 p-2 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105">
							<div className='text-xl sm:text-xl md:text-2xl lg:text-2xl'>
								<Odometer value={odometerProgressToNextLevelPercentage} />
							</div>
							<div className="text-gray-400 mt-2 center-text">Progress To Next Level (%)</div>
						</div>
						<div className="bg-gray-800 p-2 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105">
							<div className='text-xl sm:text-xl md:text-2xl lg:text-2xl'>
								<Odometer value={odometerLevel} />
							</div>
							<div className="text-gray-400 mt-2 center-text">Level</div>
						</div>
					</div>

					<div className="w-full mt-8">
						<HighchartsReact highcharts={Highcharts} options={chartOptions} />
					</div>
				</section>
			</DefaultLayout >
		);
	}
}

export async function getServerSideProps(context: { query: { server: string; user: string; }; }) {
	const { server, user } = context.query;
	
	try {
		const response = await fetch(`http://localhost:18103/get/${server}/${user}`);

		if (response.ok) {
			const data = await response.json();
			return {
				props: {
					discordAccountExists: true,
					discordUserId: user,
					discordGuildId: server,
					discordAvatarURL: data.pfp,
					discordUsername: data.name,
					discordDisplayName: data.nickname,
					odometerPoints: data.xp,
					odometerLevel: data.level,
					odometerPointsNeededToNextLevel: data.xp_needed_next_level,
					odometerPointsNeededForNextLevel: Number(data.xp + data.xp_needed_next_level),
					odometerProgressToNextLevelPercentage: data.progress_next_level,
				}
			};
		} else {
			console.error("Error fetching profile:", response.statusText);
			return {
				props: {
					discordAccountExists: false,
					discordUserId: user,
					discordGuildId: server,
					discordAvatarURL: null,
					discordUsername: null,
					discordDisplayName: null,
					odometerPoints: null,
					odometerLevel: null,
					odometerPointsNeededToNextLevel: null,
					odometerPointsNeededForNextLevel: null,
					odometerProgressToNextLevelPercentage: null,
				}
			};
		}
	} catch (error) {
		console.error("Error fetching profile:", error);
		return {
			props: {
				discordAccountExists: false,
				discordUserId: user,
				discordGuildId: server,
				discordAvatarURL: null,
				discordUsername: null,
				discordDisplayName: null,
				odometerPoints: null,
				odometerLevel: null,
				odometerPointsNeededToNextLevel: null,
				odometerPointsNeededForNextLevel: null,
				odometerProgressToNextLevelPercentage: null,
			}
		};
	}
}

export default IndexPage;