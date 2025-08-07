document.addEventListener('DOMContentLoaded', function() {
    var loadingIndicator = document.createElement('div');
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
    loadingIndicator.textContent = '正在思考中...';
    // 创建加载指示器元素
    document.body.appendChild(loadingIndicator);
    function showLoading (show) {
        if (show) {
            loadingIndicator.style.display = 'block';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }
    // 批量高亮元素
    function highlightElements(elementIds, highlight) {
        elementIds.forEach(id => {
            const svgElement = document.getElementById(id);
            if (highlight) {
                svgElement.classList.add('highlighted');
            } else {
                svgElement.classList.remove('highlighted');
            }
        })
    }
    // 隐藏suggest
    function showSuggest(show) {
        const svgElement = document.getElementById('suggest');
        if (show) {
            if (svgElement.classList.contains('hidden-suggest')) {
                svgElement.classList.remove('hidden-suggest')
            }
            svgElement.classList.add('show-suggest');
        } else {
            if (svgElement.classList.contains('show-suggest')) {
                svgElement.classList.remove('show-suggest')
            }
            svgElement.classList.add('hidden-suggest');
        }
    }
    var target_ids = []
    // 调用模型获取目标元素
    document.getElementById('model-input').addEventListener('keydown', async function (event) {
        // 回车键的键码是13
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            // 获取当前 SVG 字符串
            var svgString = svgCanvas.getSvgString();
            // 获取输入框内容
            var inputContent = document.getElementById('model-input').value.trim();
            if (!inputContent || !svgString) return
            // 显示加载指示器
            showLoading(true)
            try {
                // 发送请求到服务器
                var response = await fetch('http://39.106.255.236:8080/get_target_ids', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ svg_code: svgString, input_content: inputContent })
                });

                // 解析响应
                var result = await response.json();
                target_ids = result.target_ids || [];
                if (target_ids && target_ids.length) {
                    highlightElements(target_ids, true)
                    showLoading(false)
                    showSuggest(true)
                }
            } catch (error) {
                // 隐藏加载指示器
                loadingIndicator.style.backgroundColor = 'red';
                loadingIndicator.textContent = '请求出错:';
                setTimeout(() => {
                    showLoading(false)
                }, 500)
                console.error('请求出错:', error);
            }
        }
    })
    // 不是此元素
    document.getElementById('suggest-error').addEventListener('click', function () {
        highlightElements(target_ids, false)
        showSuggest(false)
    });
    // 是此元素
    document.getElementById('suggest-yes').addEventListener('click', function () {
        highlightElements(target_ids, false)
        showSuggest(false)
    });
    // 是此元素并执行编辑
    document.getElementById('suggest-yes-call').addEventListener('click', async function () {
        showLoading(true)
        highlightElements(target_ids, false)
        showLoading(false)
        showSuggest(false)
    })

  // 是此元素并执行编辑
  document.getElementById('suggest-yes-call').addEventListener('click', async function () {
      // 获取当前 SVG 字符串
      var svgString = svgCanvas.getSvgString();
      // 获取输入框内容
      var inputContent = document.getElementById('model-input').value.trim();
      if (!inputContent || !svgString) return
      showLoading(true)
      // 显示加载指示器
      loadingIndicator.style.display = 'block';
      try {
          // 发送请求到服务器
          var response = await fetch('http://39.106.255.236:8080/apply_modifications', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ svg_code: svgString, target_ids: target_ids, input_content: inputContent })
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
          showLoading(false)
      } catch (error) {
        // 隐藏加载指示器
        loadingIndicator.style.backgroundColor = 'red';
        loadingIndicator.textContent = '请求出错:';
        setTimeout(() => {
            showLoading(false)
        }, 500)
          console.error('请求出错:', error);
      }
  });
});