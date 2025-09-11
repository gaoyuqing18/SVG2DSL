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
    function showSuggest(className, show) {
        // 获取所有带有suggest类的元素
        const svgElements = document.getElementsByClassName(className);
        
        // 遍历所有元素进行类操作
        Array.from(svgElements).forEach(element => {
            if (show) {
                element.classList.remove('hidden');
                element.classList.add('show');
            } else {
                element.classList.remove('show');
                element.classList.add('hidden');
            }
        });
    }
    // 显示指定类型的提示词，隐藏其他所有提示词
    function showTip(tipType) {
        // 获取所有提示词元素
        const allTips = document.querySelectorAll('.suggest-tips');
        
        // 先隐藏所有提示词
        allTips.forEach(tip => {
            tip.classList.add('hidden');
        });
        
        // 显示目标提示词（如果存在）
        const targetTip = document.querySelector(`.suggest-${tipType}`);
        if (targetTip) {
            targetTip.classList.remove('hidden');
        }
    }
    // 隐藏所有提示
    function hideAllTips() {
        document.querySelectorAll('.suggest-tips').forEach(tip => {
            tip.classList.add('hidden');
        });
    }
    
    // function callModel(event) {

    // }
    var target_ids = []
    // 调用模型获取目标元素
    document.getElementById('to-preview').addEventListener('click', async function (event) {
        // 获取当前 SVG 字符串
        var svgString = svgCanvas.getSvgString();
        // 获取输入框内容
        var inputContent = document.getElementById('model-input').value.trim();
        if (!inputContent || !svgString) return
        // 显示加载指示器
        showLoading(true)
        try {
            // 发送请求到服务器
            var response = await fetch('http://39.106.255.236:8000/get_target_ids', {
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
                showSuggest('suggest-btn', true)
                showSuggest('btn-preview', false)
                showTip('preview')
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
    })
    // 不是此元素
    document.getElementById('suggest-error').addEventListener('click', function () {
        highlightElements(target_ids, false)
        showSuggest('suggest-btn', false)
        showSuggest('btn-preview', true)
        showTip('error')
    });
    // 是此元素
    document.getElementById('suggest-yes').addEventListener('click', function () {
        showSuggest('suggest-btn', false)
        showSuggest('btn-preview', true)
        showTip('yes')
    });
    // 是此元素并执行编辑
    document.getElementById('suggest-yes-call').addEventListener('click', async function () {
        showLoading(true)
        highlightElements(target_ids, false)
        showLoading(false)
        showSuggest('suggest-btn', false)
        showSuggest('btn-preview', true)
        showTip('call')
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
          var response = await fetch('http://39.106.255.236:8000/apply_modifications', {
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