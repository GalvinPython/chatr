interface ChartPoints {
    x: number;
    y: number;
    series: {
        name: string;
        xData: number[];
        yData: number[];
    };
}

export interface ChartPointsFormatted {
    points: ChartPoints[];
}

export interface ChartOptions {
	chart: {
		backgroundColor: string;
		type: string;
		zoomType: string;
	};
	title: {
		text: string;
		style: {
			color: string;
			font: string;
		};
	};
	xAxis: {
		type: string;
		tickPixelInterval: number;
		labels: {
			style: {
				color: string;
				font: string;
			};
		};
		visible: boolean;
	};
	yAxis: {
		gridLineColor: string;
		title: {
			text: string;
		};
		labels: {
			style: {
				color: string;
				font: string;
			};
		};
		visible: boolean;
	};
	plotOptions: {
		series: {
			threshold: null;
			fillOpacity: number;
			animation: boolean;
			lineWidth: number;
		};
		area: {
			fillOpacity: number;
		};
	};
	credits: {
		enabled: boolean;
		text: string;
		href: string;
	};
	time: {
		useUTC: boolean;
	};
	tooltip: {
		shared: boolean;
		formatter: (this: ChartPointsFormatted) => string;
	};
	series: {
		name: string;
		data: [number, number][];
		showInLegend: boolean;
		marker: {
			enabled: boolean;
		};
		color: string;
		lineColor: string;
		lineWidth: number;
	}[];
}