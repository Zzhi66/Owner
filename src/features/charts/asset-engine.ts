import { PieChart } from 'echarts/charts';
import { init, registerCharts } from './engine';
registerCharts([PieChart]);
export { init };
