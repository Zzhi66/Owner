import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, VisualMapComponent } from 'echarts/components';
import { init, registerCharts } from './engine';
registerCharts([HeatmapChart, CalendarComponent, VisualMapComponent]);
export { init };
