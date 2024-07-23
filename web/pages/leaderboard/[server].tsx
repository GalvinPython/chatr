import React, { Component } from 'react';
import DefaultLayout from "@/layouts/default";
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import dynamic from "next/dynamic";
import Image from 'next/image';
import "odometer/themes/odometer-theme-default.css";
import { ChartOptions, ChartPointsFormatted } from '@/types/chart';
import { PropsGuilds } from '@/types/props';
import { Leaderboard } from '@/types/leaderboard';
import Link from 'next/link';

const Odometer = dynamic(import('react-odometerjs'), {
    ssr: false,
});

interface PageState {
    urlToFetch: string;
    isLoading: boolean;
    discordGuildExists: boolean;
    discordGuildId: string;
    discordGuildIconURL: string;
    discordGuildName: string;
    odometerPoints: number;
    odometerMembers: number;
    odometerMembersBeingTracked: number;
    leaderboard: Leaderboard[];
    chartOptions: ChartOptions;
}

class IndexPage extends Component<object, PageState> {

    interval: Timer | null = null

    constructor(props: PropsGuilds) {
        super(props);

        this.state = {
            urlToFetch: process.env.NODE_ENV === 'development' ? 'http://localhost:18103' : 'https://api.chatr.fun',
            isLoading: true,
            discordGuildExists: props.discordGuildExists,
            discordGuildId: props.discordGuildId,
            discordGuildIconURL: props.discordGuildIconURL,
            discordGuildName: props.discordGuildName,
            odometerPoints: props.odometerPoints,
            odometerMembers: props.odometerMembers,
            odometerMembersBeingTracked: props.odometerMembersBeingTracked,
            leaderboard: props.leaderboard,
            chartOptions: {
                chart: {
                    backgroundColor: 'transparent',
                    type: "line",
                    zoomType: 'x'
                },
                title: {
                    text: "Total XP",
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
        if (this.state.discordGuildExists == null) {
            return;
        } else {
            fetch(`${this.state.urlToFetch}/get/${this.state.discordGuildId}`)
                .then(response => response.json())
                .then(data => {
                    const points = data.totalXp;
                    const leaderboard = data.leaderboard;

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
                            odometerMembersBeingTracked: data.guild.members,
                            odometerMembers: data.guild.members,
                            chartOptions: {
                                ...prevState.chartOptions,
                                series: [{
                                    ...prevState.chartOptions.series[0],
                                    data: updatedData as [number, number][],
                                }],
                            },
                            leaderboard, // Update the leaderboard
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

        // Setup interval to fetch data every 2 seconds after initial data fetching
        this.interval = setInterval(this.fetchData, 2000);
    }

    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval); // Clear interval when component unmounts
        }
    }

    render() {
        const { discordGuildExists, odometerPoints, odometerMembersBeingTracked, odometerMembers, chartOptions, leaderboard } = this.state;

        if (!discordGuildExists) {
            // Redirect to 404
            if (typeof window != 'undefined') {
                window.location.href = '/404';
            }
            return null;
        }

        return (
            <DefaultLayout>
                <style jsx>{`
                    @media (max-width: 810px) {
                        .grid-cols-2 {
                            grid-template-columns: 1fr;
                        }
                        .center-text {
                            text-align: center;
                        }
                    }
                    @media (max-width: 1620px) {
                        .test {
                            grid-template-columns: 1fr 1fr;
                        }
                }
                `}</style>
                <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 max-w-[90%] ml-auto mr-auto">
                    <div className="relative w-full p-4 rounded-lg flex flex-col justify-center items-center">
                        <div className="relative z-10 flex items-center bg-gray-900 p-6 rounded-full bg-opacity-90">
                            <Image
                                src={this.state.discordGuildIconURL}
                                alt="User Avatar"
                                className="w-20 h-20 rounded-full mr-4 opacity-100 border-blue-500 border-4"
                                width={174}
                                height={174}
                            />
                            <div>
                                <h2 className="text-white text-lg font-semibold  opacity-100" style={{ fontSize: "32px" }}>{this.state.discordGuildName}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Realtime */}
                    <div className="w-full p-6 rounded-lg flex flex-col md:flex-row justify-center items-stretch space-y-6 md:space-y-0 md:space-x-6">
                        <div className="flex flex-col w-full md:w-1/2 space-y-6 flex-1">
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <h2 className="text-white text-lg font-semibold  opacity-100" style={{ fontSize: "32px" }} id='tracking'>Realtime</h2>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                                    <Odometer value={odometerPoints} />
                                </div>
                                <div className="text-gray-400 mt-2 text-center text-lg">Total XP</div>
                            </div>
                        </div>

                        <div className="flex flex-col w-full md:w-1/2 space-y-6 flex-1">
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <div className="text-2xl sm:text-2xl md:text-3xl lg:text-3xl">
                                    <Odometer value={odometerMembers} />
                                </div>
                                <div className="text-gray-400 mt-2 text-center text-lg">Members</div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <div className="text-2xl sm:text-2xl md:text-3xl lg:text-3xl">
                                    <Odometer value={odometerMembersBeingTracked} />
                                </div>
                                <div className="text-gray-400 mt-2 text-center text-lg">Members Tracked</div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full mt-8">
                        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                    </div>

                    {/* Tracking */}
                    <div className="w-full p-6 rounded-lg flex flex-col md:flex-row justify-center items-stretch space-y-6 md:space-y-0 md:space-x-6">
                        <div className="flex flex-col w-full md:w-1/2 space-y-6 flex-1">
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <h2 className="text-white text-lg font-semibold  opacity-100" style={{ fontSize: "32px" }} id='tracking'>Tracking (Coming Soon)</h2>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="w-full p-6 rounded-lg flex flex-col md:flex-row justify-center items-stretch space-y-6 md:space-y-0 md:space-x-6">
                        <div className="flex flex-col w-full md:w-1/2 space-y-6 flex-1">
                            <div className="bg-gray-900 p-4 rounded-lg flex flex-col justify-center items-center transition-transform transform hover:scale-105 flex-1">
                                <h2 className="text-white text-lg font-semibold  opacity-100" style={{ fontSize: "32px" }} id='leaderboard'>Leaderboard</h2>
                            </div>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 test">
                        {leaderboard && leaderboard.length > 0 ? (
                            leaderboard.map((user, index) => {
                                const xpNeededNextLevel = user.xp_needed_next_level;
                                const totalXpForNextLevel = user.xp + xpNeededNextLevel;
                                const progressPercentage = user.progress_next_level;

								return (
									<Link href={`/user/${this.state.discordGuildId}/${user.id}`} key={user.id} className="bg-gray-800 p-6 rounded-lg flex flex-col space-y-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
										<div className="flex items-center space-x-4">
											<div className="flex-shrink-0">
												<span className="text-white text-2xl font-bold mr-4">{index + 1}.</span>
											</div>
											<Image src={user.pfp} alt={user.name} className="w-20 h-20 rounded-full border-2 border-blue-500" width={80} height={80} />
											<div className="flex-1">
												<h3 className="text-white text-3xl font-bold mb-2">{user.nickname || user.name}</h3>
												<div className="grid grid-cols-3 gap-x-6 text-white text-lg">
													<div className="flex flex-col items-center">
														<span className="text-3xl">
															<Odometer value={user.xp} />
														</span>
														<span className="text-sm">XP</span>
													</div>
													<div className="flex flex-col items-center">
														<span className="text-3xl">
															<Odometer value={user.level} />
														</span>
														<span className="text-sm">Level</span>
													</div>
													<div className="flex flex-col items-center">
														<span className="text-3xl">
															<Odometer value={user.xp_needed_next_level} />
														</span>
														<span className="text-sm">XP Needed</span>
													</div>
												</div>
											</div>
										</div>

										{/* Progress Bar */}
										<div className="relative w-full bg-gray-700 rounded-full h-8 flex items-center overflow-hidden">
											<div
												className="absolute top-0 left-0 bg-blue-500 h-full rounded-full"
												style={{ width: `${progressPercentage}%` }}
											/>
											<div className="relative w-full flex items-center justify-between px-3 text-white text-lg font-semibold">
												<span>{`${user.xp} / ${totalXpForNextLevel}`}</span>
												<span>{`${progressPercentage}%`}</span>
											</div>
										</div>
									</Link>
								);
                            })
                        ) : (
                            <p className="text-gray-400 text-lg col-span-3 text-center">No leaderboard data available.</p>
                        )}
                    </div>
                </section>
            </DefaultLayout >
        );
    }
}

export async function getServerSideProps(context: { query: { server: string }; }) {
    const { server } = context.query;

    try {
        const response = await fetch(`http://localhost:18103/get/${server}`);

        if (response.ok) {
            const data = await response.json();
            return {
                props: {
                    discordGuildExists: true,
                    discordGuildId: server,
                    discordGuildIconURL: data.guild.icon,
                    discordGuildName: data.guild.name,
                    odometerPoints: data.totalXp,
                    odometerMembers: data.guild.members,
                    odometerMembersBeingTracked: data.guild.members,
                    leaderboard: data.leaderboard,
                }
            };
        } else {
            console.error("Error fetching profile:", response.statusText);
            return {
                props: {
                    discordGuildExists: false,
                    discordGuildId: server,
                    discordGuildIconURL: null,
                    discordGuildName: null,
                    odometerPoints: null,
                    odometerMembers: null,
                    odometerMembersBeingTracked: null,
                    leaderboard: null,
                }
            };
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
        return {
            props: {
                discordGuildExists: false,
                discordGuildId: server,
                discordGuildIconURL: null,
                discordGuildName: null,
                odometerPoints: null,
                odometerMembers: null,
                odometerMembersBeingTracked: null,
                leaderboard: null,
            }
        };
    }
}

export default IndexPage;
