import { init, use as registerCharts } from 'echarts/core';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

registerCharts([AriaComponent, GridComponent, TooltipComponent, SVGRenderer]);
export { init, registerCharts };
