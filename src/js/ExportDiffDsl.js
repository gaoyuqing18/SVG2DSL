function svgDiff(oldSvg, newSvg) {
  const parser = new DOMParser();
  const oldDoc = parser.parseFromString(oldSvg, 'image/svg+xml');
  const newDoc = parser.parseFromString(newSvg, 'image/svg+xml');
  
  const oldRoot = oldDoc.documentElement;
  const newRoot = newDoc.documentElement;
  
  const changes = [];
  
  // 比较根元素
  compareElements(oldRoot, newRoot, changes);
  
  // 按path分组变更
  return groupChangesByPath(changes);
}

function groupChangesByPath(changes) {
  const grouped = {};
  
  changes.forEach(change => {
      const path = change.path;
      
      if (!grouped[path]) {
          grouped[path] = [];
      }
      
      grouped[path].push(change);
  });
  
  return grouped;
}

function compareElements(oldEl, newEl, changes) {
    // 处理新增元素
    if (!oldEl) {
        changes.push({
            type: 'add',
            path: getElementPath(newEl),
            element: serializeElement(newEl),
            id: newEl?.id || null
        });
        return;
    }

    // 处理删除元素
    if (!newEl) {
        changes.push({
            type: 'remove',
            path: getElementPath(oldEl),
            element: serializeElement(oldEl),
            id: oldEl?.id || null
        });
        return;
    }

    // 跳过非元素节点
    if (oldEl.nodeType !== 1 || newEl.nodeType !== 1) {
        return;
    }
    
    // 比较标签名
    if (oldEl.tagName !== newEl.tagName) {
        changes.push({
            type: 'replace',
            path: getElementPath(oldEl),
            oldElement: serializeElement(oldEl),
            newElement: serializeElement(newEl),
            id: oldEl?.id || newEl?.id || null
        });
        return;
    }
    // 特殊处理text和tspan元素的文本内容
    if (['text', 'tspan'].includes(oldEl.tagName.toLowerCase())) {
        const oldText = getTextContent(oldEl);
        const newText = getTextContent(newEl);
        
        if (oldText !== newText) {
            changes.push({
                type: 'text-change',
                path: getElementPath(oldEl),
                oldValue: oldText,
                newValue: newText,
                id: oldEl?.id || null
            });
        }
    }
    
    // 比较属性
    compareAttributes(oldEl, newEl, changes);
    
    // 收集子元素的ID映射
    const oldChildrenById = new Map();
    const newChildrenById = new Map();
    const oldChildrenWithoutId = [];
    const newChildrenWithoutId = [];
    
    // 处理旧元素的子元素
    Array.from(oldEl.childNodes).forEach(node => {
        if (node.nodeType === 1) {
            if (node.id) {
                oldChildrenById.set(node.id, node);
            } else {
                oldChildrenWithoutId.push(node);
            }
        }
    });
    
    // 处理新元素的子元素
    Array.from(newEl.childNodes).forEach(node => {
        if (node.nodeType === 1) {
            if (node.id) {
                newChildrenById.set(node.id, node);
            } else {
                newChildrenWithoutId.push(node);
            }
        }
    });
    
    // 比较有ID的元素
    const allIds = new Set([...oldChildrenById.keys(), ...newChildrenById.keys()]);
    allIds.forEach(id => {
        const oldChild = oldChildrenById.get(id);
        const newChild = newChildrenById.get(id);
        
        if (!oldChild) {
            changes.push({
                type: 'add',
                path: getElementPath(newEl) + `/${newChild.tagName}[id="${id}"]`,
                element: serializeElement(newChild),
                id: id
            });
        } else if (!newChild) {
            changes.push({
                type: 'remove',
                path: getElementPath(oldEl) + `/${oldChild.tagName}[id="${id}"]`,
                element: serializeElement(oldChild),
                id: id
            });
        } else {
            compareElements(oldChild, newChild, changes);
        }
    });
    
    // 比较没有ID的元素（使用原来的算法）
    const oldChildren = oldChildrenWithoutId;
    const newChildren = newChildrenWithoutId;
    
    // 使用简单的最长公共子序列算法比较子节点
    const lcsMatrix = [];
    for (let i = 0; i <= oldChildren.length; i++) {
        lcsMatrix[i] = [];
        for (let j = 0; j <= newChildren.length; j++) {
            if (i === 0 || j === 0) {
                lcsMatrix[i][j] = 0;
            } else if (isSameElement(oldChildren[i-1], newChildren[j-1])) {
                lcsMatrix[i][j] = lcsMatrix[i-1][j-1] + 1;
            } else {
                lcsMatrix[i][j] = Math.max(lcsMatrix[i-1][j], lcsMatrix[i][j-1]);
            }
        }
    }
    
    // 回溯以找到差异
    let i = oldChildren.length, j = newChildren.length;
    const operations = [];
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && isSameElement(oldChildren[i-1], newChildren[j-1])) {
            operations.unshift({type: 'same', oldIndex: i-1, newIndex: j-1});
            i--;
            j--;
        } else if (j > 0 && (i === 0 || lcsMatrix[i][j-1] >= lcsMatrix[i-1][j])) {
            operations.unshift({type: 'add', newIndex: j-1});
            j--;
        } else if (i > 0 && (j === 0 || lcsMatrix[i][j-1] < lcsMatrix[i-1][j])) {
            operations.unshift({type: 'remove', oldIndex: i-1});
            i--;
        }
    }
    
    // 处理操作
    let currentIndex = 0;
    operations.forEach(op => {
        if (op.type === 'same') {
            compareElements(oldChildren[op.oldIndex], newChildren[op.newIndex], changes);
            currentIndex++;
        } else if (op.type === 'add') {
            changes.push({
                type: 'add',
                path: getElementPath(newEl) + `/${newChildren[op.newIndex].tagName}[${currentIndex}]`,
                element: serializeElement(newChildren[op.newIndex])
            });
            currentIndex++;
        } else if (op.type === 'remove') {
            changes.push({
                type: 'remove',
                path: getElementPath(oldEl) + `/${oldChildren[op.oldIndex].tagName}[${currentIndex}]`,
                element: serializeElement(oldChildren[op.oldIndex])
            });
        }
    });
  }
  
// 新增辅助函数：获取元素的文本内容
function getTextContent(el) {
    if (!el) return '';

    // 对于text和tspan元素，获取其所有文本子节点的内容
    if (['text', 'tspan'].includes(el.tagName.toLowerCase())) {
        let text = '';
        
        // 遍历所有子节点
        Array.from(el.childNodes).forEach(node => {
            // 处理文本节点
            if (node.nodeType === 3) {
                text += node.textContent;
            }
            // 递归处理tspan子元素
            else if (node.nodeType === 1 && node.tagName.toLowerCase() === 'tspan') {
                text += getTextContent(node);
            }
        });
        
        return text;
    }

    // 对于其他元素类型，返回空字符串
    return '';
}
function compareAttributes(oldEl, newEl, changes) {
  // 跳过非元素节点
  if (oldEl.nodeType !== 1 || newEl.nodeType !== 1) {
      return;
  }
  
  const allAttrs = new Set();
  
  // 获取所有属性名
  Array.from(oldEl.attributes).forEach(attr => allAttrs.add(attr.name));
  Array.from(newEl.attributes).forEach(attr => allAttrs.add(attr.name));
  
  allAttrs.forEach(attrName => {
      const oldValue = oldEl.getAttribute(attrName);
      const newValue = newEl.getAttribute(attrName);

      // 过滤：type=attr-add 且 attribute=style 且 value=cursor: text; 的变更
      const isTargetStyleAdd = (
        oldValue === null && newValue !== null &&  // 新增属性的条件
        attrName === "style" &&                   // 属性名是 style
        newValue.trim() === "cursor: text;"       // 属性值是 cursor: text;
      );
      if (isTargetStyleAdd) {
        return; // 跳过该变更，不添加到列表
      }
      
      if (oldValue === null && newValue !== null) {
          changes.push({
              type: 'attr-add',
              path: getElementPath(oldEl),
              attribute: attrName,
              value: newValue,
              id: oldEl?.id || null
          });
      } else if (oldValue !== null && newValue === null) {
          changes.push({
              type: 'attr-remove',
              path: getElementPath(oldEl),
              attribute: attrName,
              value: oldValue,
              id: oldEl?.id || null
          });
      } else if (oldValue !== newValue) {
          changes.push({
              type: 'attr-change',
              path: getElementPath(oldEl),
              attribute: attrName,
              oldValue: oldValue,
              newValue: newValue,
              id: oldEl?.id || null
          });
      }
  });
}

function isSameElement(el1, el2) {
  // 跳过非元素节点
  if (el1.nodeType !== 1 || el2.nodeType !== 1) {
      return false;
  }
  
  if (el1.tagName !== el2.tagName) return false;
  
  // 如果都有ID，直接比较ID
  if (el1.id && el2.id) {
      return el1.id === el2.id;
  }
  
  const attrs1 = Array.from(el1.attributes);
  const attrs2 = Array.from(el2.attributes);
  
  if (attrs1.length !== attrs2.length) return false;
  
  for (const attr of attrs1) {
      if (el2.getAttribute(attr.name) !== attr.value) return false;
  }
  
  return true;
}

function getElementPath(el) {
  // 跳过非元素节点
  if (!el || el.nodeType !== 1) {
      return '';
  }
  
  const path = [];
  let current = el;
  
  while (current) {
      // 确保tagName存在
      if (!current.tagName) {
          break;
      }
      
      let tagName = current.tagName.toLowerCase();
      
      // 使用ID作为标识（如果有）
      if (current.id) {
          path.unshift(`${tagName}[id="${current.id}"]`);
      } else {
          let index = 0;
          
          if (current.parentNode) {
              const siblings = Array.from(current.parentNode.childNodes).filter(
                  node => node.nodeType === 1 && node.tagName === current.tagName
              );
              
              index = siblings.indexOf(current);
          }
          
          path.unshift(`${tagName}[${index}]`);
      }
      
      current = current.parentNode;
  }
  
  return path.join('/');
}

function serializeElement(el) {
  // 跳过非元素节点
  if (!el || el.nodeType !== 1) {
      return '';
  }
  
  const tempDoc = document.implementation.createHTMLDocument();
  const clone = tempDoc.importNode(el, true);
  tempDoc.body.appendChild(clone);
  return tempDoc.body.innerHTML;
}

// 使用示例
function runDiffExample(oldSvg, newSvg) {
  const changes = svgDiff(oldSvg, newSvg);
  console.log('检测到的变更:', changes);
  return changes;
}
document.addEventListener('DOMContentLoaded', async function() {
  // 绑定导出事件
  document.getElementById('tool_export_diff_dsl').addEventListener('click', async function() {
    var svgString = svgCanvas.getSvgString();
    
    if (!svgString) {
      alert('无法获取当前画布内容');
      return;
    }
    const originSvg = localStorage.getItem("originSvg");
    console.log("originSvg", originSvg)
    console.log("svgString", svgString)

    const diffJson = runDiffExample(originSvg, svgString)
    if (utils.isEmptyObject(diffJson)) {
      alert('未检测到内容变更');
      return;
    }
    try {
        // 发送请求到服务器
        var response = await fetch('http://39.106.255.236:8000/export_dsl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ diff: diffJson })
        });

        // 解析响应
        var result = await response.json();
        var diff_dsl = result.diff_dsl;
        const blob = new Blob([diff_dsl], { type: 'text/plain' });
        utils.downloadFile(blob, 'dsl.text')
    } catch (error) {
        console.error('请求出错:', error);
    }
  });

});