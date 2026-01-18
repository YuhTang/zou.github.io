(function () {
  // 1. 数据安全检查
  if (!window.LEDGER || !window.LEDGER.items) {
    document.body.innerHTML = "<h3 style='color:#C2A375;text-align:center;margin-top:100px;font-family:serif'>数据载入失败。<br>请确保 data.js 文件存在。</h3>";
    return;
  }

  const items = window.LEDGER.items.map((it, i) => ({ ...it, _id: i }));
  let currentResult = null; // 用于存储当前抽中的签

  // --- DOM 元素获取 ---
  // 视图容器
  const $drawView = document.getElementById("drawView");
  const $listView = document.getElementById("listView");
  const $toggleBtn = document.getElementById("toggleViewBtn");
  
  // 抽签相关
  const $drawStateReady = document.getElementById("drawReady");
  const $drawStateResult = document.getElementById("drawResult");
  const $drawBtn = document.getElementById("drawBtn");
  const $resultCard = document.getElementById("resultCard");
  const $copyResultBtn = document.getElementById("copyResultBtn");
  const $reDrawBtn = document.getElementById("reDrawBtn");

  // 列表相关
  const $list = document.getElementById("list");
  const $catSelect = document.getElementById("categorySelect");
  const $searchInput = document.getElementById("searchInput");
  const $empty = document.getElementById("empty");
  const $totalCount = document.getElementById("totalCount");
  
  // 通用
  const $toast = document.getElementById("toast");

  // --- 核心逻辑：视图切换 ---
  function switchView(viewName) {
    if (viewName === 'list') {
      $drawView.classList.remove('active');
      $listView.classList.add('active');
      $toggleBtn.textContent = "返回抽签";
      $toggleBtn.hidden = false;
      renderList(); // 进入列表时才渲染，节省性能
    } else {
      $listView.classList.remove('active');
      $drawView.classList.add('active');
      $toggleBtn.textContent = "查看全部锦囊";
      $toggleBtn.hidden = false;
      resetDrawState();
    }
  }

  $toggleBtn.onclick = () => {
    const isListActive = $listView.classList.contains('active');
    switchView(isListActive ? 'draw' : 'list');
  };

  // --- 核心逻辑：抽签仪式 ---
  function resetDrawState() {
    $drawStateResult.classList.remove('active');
    setTimeout(() => {
        $drawStateReady.classList.add('active');
    }, 300); // 简单的过渡延迟
    currentResult = null;
  }

  function performDraw() {
    if(!items.length) return alert("暂无锦囊数据");
    
    // 1. 随机抽取
    currentResult = items[Math.floor(Math.random() * items.length)];

    // 2. 填充卡片数据
    const $content = $resultCard.querySelector('.card-content');
    $content.querySelector('.card-cat').textContent = currentResult.cat;
    $content.querySelector('.card-tag').textContent = currentResult.tag || '';
    $content.querySelector('.card-quote').textContent = currentResult.quote;
    $content.querySelector('.card-refined').textContent = currentResult.refined || '';
    // 如果没有 refined，隐藏该元素以保持美观
    $content.querySelector('.card-refined').style.display = currentResult.refined ? 'block' : 'none';

    // 3. 切换状态动画
    $drawStateReady.classList.remove('active');
    // 模拟一个极短的延迟，增加仪式感
    setTimeout(() => {
        $drawStateResult.classList.add('active');
    }, 400);
  }

  $drawBtn.onclick = performDraw;
  $reDrawBtn.onclick = resetDrawState;
  $copyResultBtn.onclick = () => {
      if(currentResult) copyText(currentResult.quote);
  };


  // --- 核心逻辑：列表渲染 ---
  let isListInitialized = false;

  function initList() {
    if(isListInitialized) return;
    // 初始化分类下拉框
    const cats = [...new Set(items.map(i => i.cat))].sort();
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      $catSelect.appendChild(opt);
    });
    $totalCount.textContent = items.length;
    
    // 初始化热门标签云
    renderTagCloud();
    isListInitialized = true;
  }
  
  function renderTagCloud() {
    // 统计标签频率
    const tagStats = {};
    items.forEach(it => {
      if (it.tag) {
        tagStats[it.tag] = (tagStats[it.tag] || 0) + 1;
      }
    });
    // 排序并取前8个热门标签
    const hotTags = Object.entries(tagStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
    
    // 渲染到列表头前面
    if (hotTags.length > 0) {
      const tagCloudEl = document.createElement("div");
      tagCloudEl.className = "tag-cloud";
      tagCloudEl.innerHTML = hotTags.map(tag => 
        `<span class="hot-tag" data-tag="${tag}">${tag}</span>`
      ).join("");
      $list.parentElement.insertBefore(tagCloudEl, $list);
      
      // 添加标签点击事件
      tagCloudEl.querySelectorAll(".hot-tag").forEach(el => {
        el.onclick = (e) => {
          e.stopPropagation();
          $searchInput.value = el.dataset.tag;
          renderList();
        };
      });
    }
  }

  function renderList() {
    initList(); // 确保只初始化一次

    const catVal = $catSelect.value;
    const searchVal = $searchInput.value.toLowerCase().trim();

    const filtered = items.filter(it => {
      const matchCat = catVal === "all" || it.cat === catVal;
      const text = (it.quote + it.refined + it.tag + it.cat).toLowerCase();
      const matchSearch = !searchVal || text.includes(searchVal);
      return matchCat && matchSearch;
    });

    $list.innerHTML = "";
    $empty.hidden = filtered.length > 0;

    filtered.forEach(it => {
      const el = document.createElement("div");
      el.className = "item";
      
      // 高亮关键词的辅助函数
      const highlightText = (text) => {
        if (!searchVal) return text;
        const regex = new RegExp(`(${searchVal})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };
      
      // 读取点赞数
      const likes = JSON.parse(localStorage.getItem('likes') || '{}');
      const likeCount = likes[it._id] || 0;
      
      el.innerHTML = `
        <div class="item-head">
          <span class="item-cat">${it.cat}</span>
          <span class="item-tag">${it.tag || ""}</span>
        </div>
        <p class="quote">${highlightText(it.quote)}</p>
        ${it.refined ? `<div class="refined-preview">${highlightText(it.refined)}</div>` : ""}
        <div class="item-footer">
          <button class="like-btn" data-id="${it._id}" title="点赞">❤ ${likeCount > 0 ? likeCount : ''}</button>
        </div>
      `;
      
      el.onclick = (e) => {
        if (e.target.classList.contains('like-btn')) {
          e.stopPropagation();
          toggleLike(it._id, e.target);
        } else {
          copyText(it.quote);
        }
      };
      
      $list.appendChild(el);
    });
  }


  // --- 通用工具：复制 ---
  function toggleLike(itemId, btn) {
    const likes = JSON.parse(localStorage.getItem('likes') || '{}');
    likes[itemId] = (likes[itemId] || 0) + 1;
    localStorage.setItem('likes', JSON.stringify(likes));
    btn.textContent = `❤ ${likes[itemId]}`;
    btn.classList.add('liked');
    setTimeout(() => btn.classList.remove('liked'), 300);
  }
  
  function copyText(str) {
    // 优先使用现代 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(showToast).catch(() => fallbackCopy(str));
    } else {
      fallbackCopy(str);
    }
  }
  function fallbackCopy(str) {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        showToast();
    } catch (err) { alert("请手动长按复制"); }
    document.body.removeChild(ta);
  }
  function showToast() {
    $toast.hidden = false;
    setTimeout(() => $toast.hidden = true, 2000);
  }


  // --- 事件监听与启动 ---
  $catSelect.onchange = renderList;
  $searchInput.oninput = renderList;

  // 默认启动视图：抽签
  switchView('draw');

})();