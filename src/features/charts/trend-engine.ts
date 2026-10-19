import { LineChart, BarChart } from 'echarts/charts';
import { init, registerCharts } from './engine';
registerCharts([LineChart, BarChart]);
export { init };
