document.addEventListener('DOMContentLoaded', function() {
  // 绑定导出事件
  document.getElementById('tool_export_dsl').addEventListener('click', function() {
    var svgString = svgCanvas.getSvgString();
    
    if (!svgString) {
      alert('无法获取当前画布内容');
      return;
    }

    const dslContent = svgToDsl(svgString);
    const blob = new Blob([dslContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dsl.text';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  function svgToDsl(svgContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.documentElement;
    const dslOutput = [];

    const extractDimension = (attr) => {
      const value = svgElement.getAttribute(attr);
      if (!value) return { val: 0, unit: 'px' };
      
      if (value.endsWith('%')) {
        return { val: parseFloat(value.slice(0, -1)), unit: '%' };
      }
      
      const match = value.match(/^(\d+\.?\d*)(px|%|em|rem)?/);
      return match 
        ? { val: parseFloat(match[1]), unit: match[2] || 'px' } 
        : { val: 0, unit: 'px' };
    };

    const size = {
      width: extractDimension('width'),
      height: extractDimension('height')
    };
    dslOutput.push(`[页面] 宽度${size.width.val}${size.width.unit}，高度${size.height.val}${size.height.unit}`);

    const processElement = (el, parentTransform) => {
      const elementType = el.tagName.toLowerCase();
      const attrs = el.attributes;
      const id = el.getAttribute('id') || '';
      const title = el.getAttribute('title') || '';
      const label = title || id || elementType;

      const getAttr = (name, def) => attrs.getNamedItem(name)?.value || def;
      const transform = getAttr('transform', '');

      switch (elementType) {
        case 'rect':
          const x = parseFloat(getAttr('x', 0));
          const y = parseFloat(getAttr('y', 0));
          const w = parseFloat(getAttr('width', 0));
          const h = parseFloat(getAttr('height', 0));
          const fill = getAttr('fill', 'transparent');
          const stroke = getAttr('stroke', 'none');
          const rx = parseFloat(getAttr('rx', 0));
          const isButton = /\b(button|btn)\b/i.test(id);
          const type = isButton ? '按钮' : '矩形';
          dslOutput.push(`[${label}] ${type}，位置(${x}, ${y})，尺寸(${w}×${h})，填充色${fill}${stroke !== 'none' ? `，边框：颜色${stroke}` : ''}${rx > 0 ? `，圆角：${rx}px` : ''}`);
          break;

        case 'text':
          const fontWeightMapping = {
            'normal': '',
            'bold': '加粗',
            '100': '极细',
            '200': '超轻',
            '300': '轻量',
            '400': '正常',
            '500': '中等',
            '600': '半粗',
            '700': '粗体',
            '800': '超粗',
            '900': '极粗'
          };
          const tx = parseFloat(getAttr('x', 0));
          const ty = parseFloat(getAttr('y', 0));
          const content = el.textContent.trim() || '';
          const fontSize = getAttr('font-size', '12px');
          const fontWeight = getAttr('font-weight', '');
          const fontWeightText = fontWeightMapping[fontWeight] || fontWeight;
          const fontFamily = getAttr('font-family', 'Arial');
          const fillColor = getAttr('fill', '#000');
          const textAnchorAttr = attrs.getNamedItem('text-anchor');
          const textAnchor = textAnchorAttr ? textAnchorAttr.value.toLowerCase() : null;
          const anchorMapping = { start: '左', middle: '中', end: '右' };
          const textType = fontWeight === 'bold' && parseFloat(fontSize) > 16 ? '标题' : '文本';
          const alignment = textAnchor && anchorMapping.hasOwnProperty(textAnchor) ? `，对齐：${anchorMapping[textAnchor]}对齐` : '';
          dslOutput.push(`[${label}] ${textType}，位置(${tx}, ${ty})，内容："${content}"，字体：${fontFamily}${fontWeightText}文字大小为${fontSize}，颜色：${fillColor}${alignment}`);
          break;

        case 'circle':
          const cx = parseFloat(getAttr('cx', 0));
          const cy = parseFloat(getAttr('cy', 0));
          const r = parseFloat(getAttr('r', 0));
          const circleFill = getAttr('fill', 'transparent');
          const circleStroke = getAttr('stroke', 'none');
          dslOutput.push(`[${label}] 圆形，圆心(${cx}, ${cy})，半径${r}px，填充色${circleFill}${circleStroke !== 'none' ? `，边框：颜色${circleStroke}` : ''}`);
          break;

        case 'line':
          const x1 = parseFloat(getAttr('x1', 0));
          const y1 = parseFloat(getAttr('y1', 0));
          const x2 = parseFloat(getAttr('x2', 0));
          const y2 = parseFloat(getAttr('y2', 0));
          const lineStroke = getAttr('stroke', '#000');
          dslOutput.push(`[${label}] 线条，起点(${x1}, ${y1}) → 终点(${x2}, ${y2})，颜色${lineStroke}`);
          break;

        case 'image':
          const imgX = parseFloat(getAttr('x', 0));
          const imgY = parseFloat(getAttr('y', 0));
          const imgWidth = parseFloat(getAttr('width', 0));
          const imgHeight = parseFloat(getAttr('height', 0));
          const imgHref = getAttr('href', getAttr('xlink:href', '无路径'));
          dslOutput.push(`[${label}] 图像，来源为${imgHref}，位置(${imgX}, ${imgY})，尺寸(${imgWidth}×${imgHeight})px`);
          break;

        case 'path':
          dslOutput.push(`[${label}] 路径，数据：${getAttr('d', '无')}`);
          break;

        case 'g':
          if (transform) dslOutput.push(`[组 ${label}] 变换：${transform}`);
          break;
      }

      Array.from(el.children).forEach(child => {
        processElement(child, transform);
      });
    };

    Array.from(svgElement.children).forEach(child => {
      if (child.tagName.toLowerCase() !== 'svg') {
        processElement(child);
      }
    });

    return dslOutput.join('\n');
  }
});