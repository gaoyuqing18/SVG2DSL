document.addEventListener('DOMContentLoaded', function() {

  // 重置输入框按钮事件
  document.getElementById('reset-input').addEventListener('click', function () {
    document.getElementById('model-input').value = '';
  });

  // 调用模型修改 SVG 按钮事件
  document.getElementById('call-model').addEventListener('click', async function () {
      // 获取当前 SVG 字符串
      var svgString = svgCanvas.getSvgString();
      // 获取输入框内容
      var inputContent = document.getElementById('model-input').value;
      console.log(svgString, 222)

      try {
          // 发送请求到服务器
          var response = await fetch('http://localhost:6006/modify_svg', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ svg_code: svgString, input_content: inputContent })
          });

          // 解析响应
          var result = await response.json();
          console.log(result, 333)
          var newSvgString = result.modified_svg;

          // 加载新的 SVG 字符串到编辑器中
          editor.import.loadSvgString(newSvgString, function (success) {
              if (success) {
                  console.log('SVG 修改成功');
              } else {
                  console.log('SVG 修改失败');
              }
          });
      } catch (error) {
          console.error('请求出错:', error);
      }
  });
});