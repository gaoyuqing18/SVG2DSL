document.addEventListener('DOMContentLoaded', function() {
    // 创建加载指示器元素
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.style.display = 'none';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.borderRadius = '5px';
    loadingIndicator.textContent = '正在调用大模型修改 SVG，请稍候...';
    document.body.appendChild(loadingIndicator);

  // 重置输入框按钮事件
  document.getElementById('reset-input').addEventListener('click', function () {
    document.getElementById('model-input').value = '';
  });

  // 调用模型修改 SVG 按钮事件
  document.getElementById('call-model').addEventListener('click', async function () {
      // 获取当前 SVG 字符串
      var svgString = svgCanvas.getSvgString();
      // 获取输入框内容
      var inputContent = document.getElementById('model-input').value.trim();
      if (!inputContent || !svgString) return
      // 显示加载指示器
      loadingIndicator.style.display = 'block';
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
          var newSvgString = result.modified_svg;

          // 加载新的 SVG 字符串到编辑器中
          editor.import.loadSvgString(newSvgString, function (success) {
              if (success) {
                  console.log('SVG 修改成功');
              } else {
                  console.log('SVG 修改失败');
              }
          });
          // 隐藏加载指示器
          loadingIndicator.style.display = 'none';
      } catch (error) {
        // 隐藏加载指示器
        loadingIndicator.style.backgroundColor = 'red';
        loadingIndicator.textContent = '请求出错:';
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 500)
          console.error('请求出错:', error);
      }
  });
});