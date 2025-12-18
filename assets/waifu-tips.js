/*

    く__,.ヘヽ.　　　　/　,ー､ 〉
    　　　　　＼ ', !-─‐-i　/　/´
    　　　 　 ／｀ｰ'　　　 L/／｀ヽ､            Live2D 看板娘 参数设置
    　　 　 /　 ／,　 /|　 ,　 ,　　　 ',                                           Version 1.4.2
    　　　ｲ 　/ /-‐/　ｉ　L_ ﾊ ヽ!　 i                            Update 2018.11.12
    　　　 ﾚ ﾍ 7ｲ｀ﾄ　 ﾚ'ｧ-ﾄ､!ハ|　 |  
    　　　　 !,/7 '0'　　 ´0iソ| 　 |　　　
    　　　　 |.从"　　_　　 ,,,, / |./ 　 |             网页添加 Live2D 看板娘
    　　　　 ﾚ'| i＞.､,,__　_,.イ / 　.i 　|                    https://www.fghrsh.net/post/123.html
    　　　　　 ﾚ'| | / k_７_/ﾚ'ヽ,　ﾊ.　|           
    　　　　　　 | |/i 〈|/　 i　,.ﾍ |　i　|    Thanks
    　　　　　　.|/ /　ｉ： 　 ﾍ!　　＼　|          journey-ad / https://github.com/journey-ad/live2d_src
    　　　 　 　 kヽ>､ﾊ 　 _,.ﾍ､ 　 /､!            xiazeyu / https://github.com/xiazeyu/live2d-widget.js
    　　　　　　 !'〈//｀Ｔ´', ＼ ｀'7'ｰr'          Live2d Cubism SDK WebGL 2.1 Projrct & All model authors.
    　　　　　　 ﾚ'ヽL__|___i,___,ンﾚ|ノ
    　　　　　 　　　ﾄ-,/　|___./
    　　　　　 　　　'ｰ'　　!_,.:
*/

// ==========================================
//       1. 全局配置默认值定义 (统一入口)
// ==========================================

const default_settings = JSON.parse(JSON.stringify(window.WAIFU_GLOBAL_DEFAULTS));

// ==========================================
//       2. 初始化配置 (加载本地存储)
// ==========================================

default_settings.defaultModel = default_settings.defaultModel.replace(/MODEL_HOME/g, default_settings.staticPath);

// 初始化全局对象 (使用 Object 而不是 Array)
window.live2d_settings = {};

try {
    // 1. 加载所有设置到 live2d_settings
    var saved = localStorage.getItem('waifu_global_settings');
    var savedObj = saved ? JSON.parse(saved) : {};

    // 2. 深度合并：默认值 -> 本地存储值
    // 使用 $.extend(true, ...) 如果需要深拷贝，或者简单的一层合并
    // 这里使用 Object.assign 或 $.extend 均可
    window.live2d_settings = $.extend({}, default_settings, savedObj);
    
    console.log('[Status] Configuration loaded.');
} catch (e) { 
    console.error('Settings Load Error', e); 
    window.live2d_settings = default_settings; // 降级处理
}

// 辅助函数：保存当前所有设置到统一的 Key
function saveGlobalSettings() {
    try {
        // 过滤掉不需要保存的运行时状态 (可选)
        // var toSave = JSON.parse(JSON.stringify(live2d_settings));
        // delete toSave.isLLMThinking;
        
        localStorage.setItem('waifu_global_settings', JSON.stringify(live2d_settings));
    } catch (e) {
        console.error("Save Error:", e);
    }
}

/****************************************************************************************************/

// Load static api configurations
var staticAPI;
var staticAPILoaded = false;

$.getJSON(live2d_settings.staticAPIFile, function(result){
    staticAPI = result;
    staticAPILoaded = true;
    console.log('[Status] Static API loaded successfully');
    console.log('[Info] Available models:', staticAPI.model_list.models.length);
}).fail(function(error) {
    console.error('[Error] Failed to load static API:', error);
});

// 终止模型思考
var llmAbortController = null;
function stopLLMGeneration() {
    if (llmAbortController) {
        llmAbortController.abort(); // 1. 中止网络请求
        llmAbortController = null;
    }
    
    // 2. 重置状态锁
    live2d_settings.isLLMThinking = false; 
    live2d_settings.isLLMWriting = false;
    
    // 3. 界面反馈
    // showMessage("已强制终止思考。(>_<)", 2000, true);
    $('.waifu-tool .fui-pause').hide(); // 隐藏停止按钮
}

// --- 绑定按钮事件 ---
$(document).on('click', '.waifu-tool .fui-pause', function() {
    stopLLMGeneration();
});

function localAPI(action, modelID, texturesID=0){
    // modelID = modelID > 0 ? modelID-1 : 0;
    // texturesID = texturesID > 0 ? texturesID-1 : 0;
    if(action === 'get'){
        live2d_settings.nowModelID = modelID;
        live2d_settings.nowTexturesID = texturesID;
        if(staticAPI === undefined){
            let blob = new Blob(
                [live2d_settings.defaultModel], { type: 'Application/json' }
            )  // type 的值为要创建的文件的MIME
            return URL.createObjectURL( blob );
        } else {
            if(typeof staticAPI.model_list.models[modelID] === 'string'){
                let json_pat = staticAPI.json_pattern[staticAPI.model_list.models[modelID]];
                json_pat = json_pat.replace(/\"TEXTURES_REP\"/g, JSON.stringify(staticAPI.Textures[modelID][texturesID]));
                json_pat = json_pat.replace(/MODEL_HOME/g, live2d_settings['staticPath']);
                let blob = new Blob(
                    [json_pat], { type: 'Application/json' }
                )  // type 的值为要创建的文件的MIME
                return URL.createObjectURL( blob );
            } else {
                let model_name = staticAPI.model_list.models[modelID][texturesID];
                let json_pat = staticAPI.json_pattern[model_name];
                json_pat = json_pat.replace(/\"TEXTURES_REP\"/g, JSON.stringify(staticAPI.Textures[modelID][texturesID]));
                json_pat = json_pat.replace(/MODEL_HOME/g, live2d_settings['staticPath']);
                let blob = new Blob(
                    [json_pat], { type: 'Application/json' }
                )  // type 的值为要创建的文件的MIME
                return URL.createObjectURL( blob );
            }
        }
    } else if (action === 'randModel'){
        let newModelID = Math.floor(Math.random()*(staticAPI.model_list.models.length));
        while(newModelID === modelID && newModelID !== 0){
            newModelID = Math.floor(Math.random()*(staticAPI.model_list.models.length));
        }
        loadModel(newModelID, 0);
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'switchModel'){
        let newModelID = modelID+1;
        if(newModelID >= staticAPI.model_list.models.length){
            newModelID = 0;
        }
        loadModel(newModelID, 0);
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'randTextures' || action === 'switchTextures'){
        
        // 1. 获取当前模型总共有多少个皮肤
        let totalTexturesNum;
        if(typeof staticAPI.model_list.models[modelID] === 'string'){
            totalTexturesNum = staticAPI.Textures[modelID].length;
        } else {
            totalTexturesNum = staticAPI.model_list.models[modelID].length;
        }

        // 2. 【关键修复】如果只有1个皮肤，直接提示并退出，防止死循环
        if (totalTexturesNum <= 1) {
            // 尝试读取 waifu_tips 里的文本，如果没有则用默认文本
            var text = "我还没有其他衣服呢";
            if (window.waifu_tips && window.waifu_tips.waifu && window.waifu_tips.waifu.load_rand_textures) {
                text = window.waifu_tips.waifu.load_rand_textures[0]; 
            }
            showMessage(text, 3000, true);
            return; 
        }

        // 3. 计算新的 ID
        let newTextureID;
        if (action === 'randTextures') {
            // 随机逻辑
            newTextureID = Math.floor(Math.random()*totalTexturesNum);
            // 只有当 total > 1 时，while 循环才是安全的
            while(newTextureID === texturesID){
                newTextureID = Math.floor(Math.random()*totalTexturesNum);
            }
        } else {
            // 顺序切换逻辑
            newTextureID = texturesID + 1;
            if(newTextureID >= totalTexturesNum){
                newTextureID = 0;
            }
        }

        // 4. 显示切换成功的提示
        var successText = "我的新衣服好看吗";
        if (window.waifu_tips && window.waifu_tips.waifu && window.waifu_tips.waifu.load_rand_textures) {
            successText = window.waifu_tips.waifu.load_rand_textures[1]; 
        }
        showMessage(successText, 3000, true);

        // 5. 加载新皮肤
        loadModel(modelID, newTextureID);
    }
}


String.prototype.render = function(context) {
    var tokenReg = /(\\)?\{([^\{\}\\]+)(\\)?\}/g;
    return this.replace(tokenReg, function (word, slash1, token, slash2) {
        if (slash1 || slash2) { return word.replace('\\', ''); }
        var variables = token.replace(/\s/g, '').split('.');
        var currentObject = context;
        var i, length, variable;
        for (i = 0, length = variables.length; i < length; ++i) {
            variable = variables[i];
            currentObject = currentObject[variable];
            if (currentObject === undefined || currentObject === null) return '';
        }
        return currentObject;
    });
};

var re = /x/;
console.log(re);

function empty(obj) {return typeof obj=="undefined"||obj==null||obj==""?true:false}
function getRandText(text) {return Array.isArray(text) ? text[Math.floor(Math.random() * text.length + 1)-1] : text}

function showMessage(text, timeout, flag) {
    // 如果 LLM 正在思考，且当前不是 LLM 主动更新消息（通过 flag 判断或专用变量），则拦截
    // 我们利用 live2d_settings.isLLMThinking 这个变量作为锁
    // live2d_settings.isLLMWriting 用于允许 LLM 自己更新“思考中”或“回复”的状态
    if (live2d_settings.showLLM && live2d_settings.isLLMThinking && !live2d_settings.isLLMWriting) {
        console.log('[Message Blocked] 看板娘正在深度思考，已忽略干扰信息:', text);
        return; 
    }

    if(flag || sessionStorage.getItem('waifu-text') === '' || sessionStorage.getItem('waifu-text') === null){
        if(Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1)-1];
        if (live2d_settings.showF12Message) console.log('[Message]', text.replace(/<[^<>]+>/g,''));
        
        if(flag) sessionStorage.setItem('waifu-text', text);
        
        $('.waifu-tips').stop();
        $('.waifu-tips').html(text).fadeTo(200, 1);
        // 如果 timeout 是 0，表示不自动隐藏（思考中状态）
        if (timeout === 0) {
            // 仅仅停止当前动画，不调用 hideMessage
            $('.waifu-tips').stop().css('opacity', 1);
        } else {
            if (timeout === undefined) timeout = 5000;
            hideMessage(timeout);
        }
    }
}

function hideMessage(timeout) {
    $('.waifu-tips').stop().css('opacity',1);
    if (timeout === undefined) timeout = 5000;
    window.setTimeout(function() {sessionStorage.removeItem('waifu-text')}, timeout);
    $('.waifu-tips').delay(timeout).fadeTo(200, 0);
}

function initModel(waifuPath, type) {
    // ==========================================
    //       全局设置面板绑定逻辑
    // ==========================================
    $(document).ready(function() {
        // 初始化设置面板
        initSettingsPanel();
        window.addEventListener('storage', function(e) {
            if (e.key === 'waifu_global_settings') {
                console.log('检测到设置变更，正在同步...');
                // 重新读取配置
                try {
                    var saved = localStorage.getItem('waifu_global_settings');
                    if (saved) $.extend(live2d_settings, JSON.parse(saved));
                    
                    if (typeof applyImmediateChanges === 'function') {
                        for(var k in live2d_settings) {
                            applyImmediateChanges(k, live2d_settings[k]);
                        }
                    }
                } catch(err) {}
            }
        });
    });

    function initSettingsPanel() {
        // 填充 UI (使用 live2d_settings)
        updateUIFromSettings();

        // 监听修改
        $('.config-item').change(function() {
            var $input = $(this);
            var key = $input.data('key');
            var val;

            if ($input.attr('type') === 'checkbox') {
                val = $input.is(':checked');
            } else {
                val = $input.val();
            }

            // 更新全局变量
            live2d_settings[key] = val;

            // 立即应用部分 UI 变化 (即时反馈)
            applyImmediateChanges(key, val);

            // 保存所有 config-item 到 LocalStorage
            saveGlobalSettings();
        });

        $('.waifu-tool .fui-gear').click(function() { $('.waifu-settings-panel').addClass('open'); });
        $('.settings-close').click(function() { $('.waifu-settings-panel').removeClass('open'); });
    }
    
    // 从 live2d_settings 恢复 UI 状态
    function updateUIFromSettings() {
        $('.config-item').each(function() {
            var key = $(this).data('key');
            var val = live2d_settings[key];
            if (key && val !== undefined) {
                if ((key === 'waifuSize' || key === 'waifuTipsSize') && Array.isArray(val)) val = val[0] + 'x' + val[1];
                if ($(this).attr('type') === 'checkbox') $(this).prop('checked', val);
                else $(this).val(val);
            }
        });
        toggleUI();
    }

    function applyImmediateChanges(key, val) {
        toggleUI()
        function toggleBtn($el, show) {
            if (show) $el.css('display', ''); 
            else $el.hide(); 
        }

        if (key === 'showToolMenu') toggleBtn($('.waifu-tool'), val);
        if (key === 'canTurnToHomePage') toggleBtn($('.waifu-tool .fui-home'), val);
        if (key === 'canSwitchHitokoto') toggleBtn($('.waifu-tool .fui-chat'), val);
        if (key === 'canSwitchModel') toggleBtn($('.waifu-tool .fui-eye'), val);
        if (key === 'canSwitchTextures') toggleBtn($('.waifu-tool .fui-user'), val);
        if (key === 'canTakeScreenshot') toggleBtn($('.waifu-tool .fui-photo'), val);
        if (key === 'canTurnToAboutPage') toggleBtn($('.waifu-tool .fui-info-circle'), val);
        if (key === 'canCloseLive2d') toggleBtn($('.waifu-tool .fui-cross'), val);
        if (key === 'showLLM') toggleBtn($('.waifu-tool .fui-star'), val); 
        if (key === 'showHistory') toggleBtn($('.waifu-tool .fui-mail'), val); 
        if (key === 'showPeek') toggleBtn($('.waifu-tool .fui-video'), val); 
        if (key === 'showSettings') toggleBtn($('.waifu-tool .fui-gear'), val); 
        
        // 样式微调
        if (key === 'waifuDraggable') {
            if ($(".waifu").hasClass("ui-draggable")) {
                if (val === 'disable') $(".waifu").draggable('disable');
                else $(".waifu").draggable('enable');
            }
        }
    }

    // --- 图片上传逻辑 ---
    var currentImageUrl = null;    // 存储服务器上的 URL (用于展示和存入历史)
    var currentImageBase64 = null; // 存储 Base64 (仅用于发送给 LLM 接口，因为 LLM 通常直接要数据)

    // 点击相机图标 -> 触发文件选择
    $('#waifu-upload-btn').click(function() {
        $('#waifu-file-input').click();
    });

    // 文件选择变动
    $('#waifu-file-input').change(function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = async function(evt) {
            var base64Data = evt.target.result;
            
            // --- 上传到 Python 后端 ---
            try {
                // 显示“上传中...”的提示
                showMessage("正在把照片存进相册...", 2000);
                const response = await fetch(live2d_settings.pythonServerUrl + 'upload_image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64_data: base64Data })
                });
                const data = await response.json();
                if (data.success) {
                    currentImageUrl = data.url;      // 服务器图片地址 (http://127.0.0.1:11542/...)
                    currentImageBase64 = base64Data; // 保持 Base64 供发送给 LLM
                    // 显示预览
                    $('#waifu-preview-img').attr('src', currentImageUrl);
                    $('#waifu-img-preview-container').show();
                    $('#waifu-input').focus();
                } else {
                    showMessage("哎呀，照片没存好，换一张试试？", 3000);
                }
            } catch (err) {
                console.error("上传图片错误:", err);
                showMessage("啊哦，图片上传出了点问题，是不是Python后端没启动？。", 3000);
            }
        };
        reader.readAsDataURL(file);
    });

    // 点击删除预览图
    $('#waifu-preview-close').click(function() {
        currentImageBase64 = null;
        currentImageUrl = null;
        $('#waifu-file-input').val(''); // 清空 input，允许再次选择同一张图
        $('#waifu-img-preview-container').hide();
    });

    // ==========================================
    //           历史记录侧边栏逻辑
    // ==========================================

    // 1. 点击按钮：打开侧边栏并渲染
    $(document).on('click', '.waifu-tool .fui-mail', function() {
        // 1. 先触发动画（让面板滑出来）
        $('.waifu-history-panel').addClass('open');
        
        // 2. 同步打开输入框逻辑（保持不变）
        var chatBox = $('.waifu-chat-box');
        if (!chatBox.is(':visible')) chatBox.slideDown(200);
        $('#waifu-input').focus();

        // 3. 【关键优化】将重渲染推迟，给浏览器一点时间处理动画帧
        // 显示一个临时的加载状态（可选）
        if($('#history-list').is(':empty')) {
             $('#history-list').html('<div style="text-align:center;padding:20px;color:#999;">加载中...</div>');
        }

        requestAnimationFrame(function() {
            // 再延迟一点点，确保侧边栏已经开始移动
            setTimeout(function() {
                renderHistoryPanel();
            }, 50); 
        });
    });

    // 2. 点击关闭按钮：关闭侧边栏
    $(document).on('click', '.history-close', function() {
        $('.waifu-history-panel').removeClass('open');
        $('.waifu-chat-box').slideUp(200);
    });

    // 3. 点击遮罩层关闭 (如果之后你想加遮罩层的话，这里预留逻辑)
    // 目前点击面板外部不做处理，或者你可以给 body 加个点击事件来检测

    // 4. 核心渲染函数
    function renderHistoryPanel() {
        var $container = $('#history-list');
        $container.empty(); // 清空旧内容

        // 读取 LocalStorage
        var historyStr = localStorage.getItem('waifu_chat_history');
        if (!historyStr || historyStr === '[]') {
            $container.html('<div class="history-empty">还没有和看板娘说过话哦~<br>快去聊两句吧！</div>');
            return;
        }

        var history = [];
        try {
            history = JSON.parse(historyStr);
        } catch (e) {
            $container.html('<div class="history-empty">记录损坏，无法读取</div>');
            return;
        }

        // 遍历并生成 HTML
        history.forEach(function(msg) {
            // 跳过 system 提示词，只显示对话
            if (msg.role === 'system') return;

            var roleClass = msg.role; // 'user' or 'assistant'
            var roleName = (msg.role === 'user') ? '你' : '看板娘';
            var html = '';

            // --- 解析消息内容 (兼容纯文本和多模态图片数组) ---
            var contentHtml = '';
            
            if (Array.isArray(msg.content)) {
                // 如果是数组 (包含图片)
                msg.content.forEach(function(item) {
                    if (item.type === 'text') {
                        contentHtml += `<div>${escapeHtml(item.text)}</div>`;
                    } else if (item.type === 'image_url') {
                        // 这里的 url 可能是本地 Python 后端的链接
                        contentHtml += `<img src="${item.image_url.url}" alt="image" onclick="window.open(this.src)">`;
                    }
                });
            } else {
                // 纯文本
                contentHtml = escapeHtml(msg.content);
            }

            // 组装气泡结构
            html = `
                <div class="chat-item ${roleClass}">
                    <div class="chat-meta">${roleName}</div>
                    <div class="chat-bubble">${contentHtml}</div>
                </div>
            `;
            $container.append(html);
        });

        // 自动滚动到底部
        setTimeout(function() {
            $container.scrollTop($container[0].scrollHeight);
        }, 50);
    }

    // 辅助函数：防止 HTML 注入 (XSS)
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            // 简单处理换行符
            .replace(/\n/g, "<br>");
    }

    // --- 动态追加单条消息到历史面板 ---
    function appendHistoryItem(role, text, imgUrl) {
        // 1. 如果面板没打开，就不需要实时渲染 DOM，等下次打开时 renderHistoryPanel 会自动读取最新 storage
        if (!$('.waifu-history-panel').hasClass('open')) return;
        var $container = $('#history-list');
        // 如果是“暂无记录”状态，先清空
        if ($container.find('.history-empty').length > 0) {
            $container.empty();
        }
        var roleClass = role; 
        var roleName = (role === 'user') ? '你' : '看板娘';
        
        var contentHtml = '';
        // 处理文本
        if (text) {
            contentHtml += `<div>${escapeHtml(text)}</div>`;
        }
        
        // 处理图片 (使用传入的 URL)
        if (imgUrl) {
            contentHtml += `<img src="${imgUrl}" alt="image" onclick="window.open(this.src)" style="max-width:100%; border-radius:4px; margin-top:5px; cursor:pointer; display:block;">`;
        }
        // 组装 HTML
        var html = `
            <div class="chat-item ${roleClass}">
                <div class="chat-meta">${roleName}</div>
                <div class="chat-bubble">${contentHtml}</div>
            </div>
        `;
        // 追加并滚动
        $container.append(html);
        setTimeout(function() {
            $container.scrollTop($container[0].scrollHeight);
        }, 10);
    }

    // 等待 staticAPI 加载完成
    if (!staticAPILoaded) {
        console.log('[Info] Waiting for static API to load...');
        setTimeout(function() { initModel(waifuPath, type); }, 100);
        return;
    }

    /* console welcome message */
    eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('8.d(" ");8.d("\\U,.\\y\\5.\\1\\1\\1\\1/\\1,\\u\\2 \\H\\n\\1\\1\\1\\1\\1\\b \', !-\\r\\j-i\\1/\\1/\\g\\n\\1\\1\\1 \\1 \\a\\4\\f\'\\1\\1\\1 L/\\a\\4\\5\\2\\n\\1\\1 \\1 /\\1 \\a,\\1 /|\\1 ,\\1 ,\\1\\1\\1 \',\\n\\1\\1\\1\\q \\1/ /-\\j/\\1\\h\\E \\9 \\5!\\1 i\\n\\1\\1\\1 \\3 \\6 7\\q\\4\\c\\1 \\3\'\\s-\\c\\2!\\t|\\1 |\\n\\1\\1\\1\\1 !,/7 \'0\'\\1\\1 \\X\\w| \\1 |\\1\\1\\1\\n\\1\\1\\1\\1 |.\\x\\"\\1\\l\\1\\1 ,,,, / |./ \\1 |\\n\\1\\1\\1\\1 \\3\'| i\\z.\\2,,A\\l,.\\B / \\1.i \\1|\\n\\1\\1\\1\\1\\1 \\3\'| | / C\\D/\\3\'\\5,\\1\\9.\\1|\\n\\1\\1\\1\\1\\1\\1 | |/i \\m|/\\1 i\\1,.\\6 |\\F\\1|\\n\\1\\1\\1\\1\\1\\1.|/ /\\1\\h\\G \\1 \\6!\\1\\1\\b\\1|\\n\\1\\1\\1 \\1 \\1 k\\5>\\2\\9 \\1 o,.\\6\\2 \\1 /\\2!\\n\\1\\1\\1\\1\\1\\1 !\'\\m//\\4\\I\\g\', \\b \\4\'7\'\\J\'\\n\\1\\1\\1\\1\\1\\1 \\3\'\\K|M,p,\\O\\3|\\P\\n\\1\\1\\1\\1\\1 \\1\\1\\1\\c-,/\\1|p./\\n\\1\\1\\1\\1\\1 \\1\\1\\1\'\\f\'\\1\\1!o,.:\\Q \\R\\S\\T v"+e.V+" / W "+e.N);8.d(" ");',60,60,'|u3000|uff64|uff9a|uff40|u30fd|uff8d||console|uff8a|uff0f|uff3c|uff84|log|live2d_settings|uff70|u00b4|uff49||u2010||u3000_|u3008||_|___|uff72|u2500|uff67|u30cf|u30fc||u30bd|u4ece|u30d8|uff1e|__|u30a4|k_|uff17_|u3000L_|u3000i|uff1a|u3009|uff34|uff70r|u30fdL__||___i|l2dVerDate|u30f3|u30ce|nLive2D|u770b|u677f|u5a18|u304f__|l2dVersion|FGHRSH|u00b40i'.split('|'),0,{}));
    
    if (typeof($.ajax) != 'function') typeof(jQuery.ajax) == 'function' ? window.$ = jQuery : console.log('[Error] JQuery is not defined.');
    
    /* 加载看板娘样式 */
    var s_waifuSize = live2d_settings.waifuSize.split('x');
    var s_waifuTipsSize = live2d_settings.waifuTipsSize.split('x');
    var s_waifuEdgeSide = live2d_settings.waifuEdgeSide.split(':');
    
    $("#live2d").attr("width",s_waifuSize[0]);
    $("#live2d").attr("height",s_waifuSize[1]);
    $(".waifu-tips").width(s_waifuTipsSize[0]);
    $(".waifu-tips").height(s_waifuTipsSize[1]);
    $(".waifu-tips").css("top",live2d_settings.waifuToolTop);
    $(".waifu-tips").css("font-size",live2d_settings.waifuFontSize);
    $(".waifu-tool").css("font-size",live2d_settings.waifuToolFont);
    $(".waifu-tool span").css("line-height",live2d_settings.waifuToolLine);
    
    if (s_waifuEdgeSide[0] == 'left') $(".waifu").css("left",s_waifuEdgeSide[1]+'px');
    else if (s_waifuEdgeSide[0] == 'right') $(".waifu").css("right",s_waifuEdgeSide[1]+'px');
    
    window.waifuResize = function() { $(window).width() <= Number(live2d_settings.waifuMinWidth.replace('px','')) ? $(".waifu").hide() : $(".waifu").show(); };
    if (live2d_settings.waifuMinWidth != 'disable') { waifuResize(); $(window).resize(function() {waifuResize()}); }
    
    try {
        if (live2d_settings.waifuDraggable == 'axis-x') $(".waifu").draggable({ axis: "x", revert: live2d_settings.waifuDraggableRevert });
        else if (live2d_settings.waifuDraggable == 'unlimited') $(".waifu").draggable({ revert: live2d_settings.waifuDraggableRevert });
        else $(".waifu").css("transition", 'all .3s ease-in-out');
    } catch(err) { console.log('[Error] JQuery UI is not defined.') }
    
    live2d_settings.homePageUrl == 'auto' ? window.location.protocol+'//'+window.location.hostname+'/' : live2d_settings.homePageUrl;
    if (window.location.protocol == 'file:' && live2d_settings.modelAPI.substr(0,2) == '//') live2d_settings.modelAPI = 'http:'+live2d_settings.modelAPI;
    
    $('.waifu-tool .fui-home').click(function (){ window.location = live2d_settings.homePageUrl; });
    $('.waifu-tool .fui-info-circle').click(function (){ window.open(live2d_settings.aboutPageUrl); });
    
    if (typeof(waifuPath) == "object") loadTipsMessage(waifuPath); else {
        $.ajax({
            cache: true,
            url: waifuPath == '' ? live2d_settings.tipsMessage : (waifuPath.substr(waifuPath.length-15)=='waifu-tips.json'?waifuPath:waifuPath+'waifu-tips.json'),
            dataType: "json",
            success: function (result){ loadTipsMessage(result); }
        });
    }
    
    // 应用初始按钮状态
    for (var k in live2d_settings) {
        applyImmediateChanges(k, live2d_settings[k]);
    }
    $('.waifu-tool .fui-pause').hide(); // 隐藏停止按钮

    if (waifuPath === undefined) waifuPath = '';
    var modelId, modelTexturesId;
    
    if (live2d_settings.modelStorage) {
        modelId = localStorage.getItem('modelId');
        modelTexturesId = localStorage.getItem('modelTexturesId');
        console.log('[Debug] Retrieved from localStorage - modelId:', modelId, 'texturesId:', modelTexturesId);
    }
    
    if (!modelId || modelId === null) {
        modelId = live2d_settings.modelId;
        console.log('[Debug] Using default modelId:', modelId);
    }
    if (!modelTexturesId || modelTexturesId === null) {
        modelTexturesId = live2d_settings.modelTexturesId;
        console.log('[Debug] Using default texturesId:', modelTexturesId);
    }
    
    // 转换为数字类型
    modelId = parseInt(modelId);
    modelTexturesId = parseInt(modelTexturesId);
    
    console.log('[Debug] Final loading - modelId:', modelId, 'texturesId:', modelTexturesId);
    loadModel(modelId, modelTexturesId);

    // ==========================================
    //       LLM 大模型对话逻辑 & 设置面板
    // ==========================================

    $(document).ready(function() {
        toggleUI();
        fetchModelList();
    });
    // 切换 UI 显示
    function toggleUI() {
        var mode = $('#peek-mode').val();
        var target = $('#peek-target-type').val();
        $('.prompt-group').hide();
        $('#group-prompt-' + mode).show();
        if (target === 'window') $('#group-window-select').show();
        else $('#group-window-select').hide();
    }

    // 刷新模型列表
    $('#btn-refresh-models').click(function() {
        $(this).text('刷新中...');
        fetchModelList($(this));
    });
    // 重置提示词
    $('#btn-reset-roast').click(function() {
        if(confirm('重置吐槽提示词？')) { 
            $('#prompt-roast').val(default_settings.roastPrompt); 
            live2d_settings.roastPrompt = default_settings.roastPrompt;
            saveGlobalSettings();
        }
    });
    $('#btn-reset-chat').click(function() {
        if(confirm('重置助手提示词？')) { 
            $('#prompt-chat').val(default_settings.chatPrompt); 
            live2d_settings.chatPrompt = default_settings.chatPrompt;
            saveGlobalSettings();
        }
    });
    $('#btn-reset-waifu').click(function(){ 
        if(confirm('重置看板娘提示词？')) { 
            $('#prompt-waifu').val(defaultSettings.waifuPrompt); 
            live2d_settings.waifuPrompt = defaultSettings.waifuPrompt;
            saveGlobalSettings();
        }
    });
    // 刷新窗口列表
    $('#btn-refresh-windows').click(async function() {
        var $btn = $(this);
        $btn.text('...');
        try {
            const response = await fetch(live2d_settings.pythonServerUrl + 'list_windows');
            const data = await response.json();
            var html = '';
            if (data.windows) {
                data.windows.forEach(w => html += `<option value="${w.id}">${w.title}</option>`);
            }
            $('#peek-window-list').html(html);
            if(live2d_settings.targetHwid) $('#peek-window-list').val(live2d_settings.targetHwid);
        } catch (e) { console.log(e) }
        $btn.text('刷新');
    });

    setTimeout(function() {
        if (live2d_settings.pythonServerUrl) {
            fetchModelList();
            $('#btn-refresh-windows').click(); 
        }
    }, 100);
    
    // 获取模型列表
    async function fetchModelList(btn) {
        try {
            var url = live2d_settings.pythonServerUrl + 'list_models';
            const response = await fetch(url);
            const data = await response.json();
            
            var optionsHtml = '';
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => { optionsHtml += `<option value="${m}">${m}</option>`; });
            } else {
                optionsHtml = '<option value="">未找到模型</option>';
            }
            $('#model-normal').html(optionsHtml);
            $('#model-thinking').html(optionsHtml);
            if (live2d_settings.modelNormal){
                if($('#model-normal option[value="' + live2d_settings.modelNormal + '"]').length === 0)
                    $('#model-normal').html(`<option value="${live2d_settings.modelNormal}">${live2d_settings.modelNormal}</option>`);
                $('#model-normal').val(live2d_settings.modelNormal);
            }
                
            if (live2d_settings.modelThinking){
                if ($('#model-thinking option[value="' + live2d_settings.modelThinking + '"]').length === 0)
                    $('#model-thinking').html(`<option value="${live2d_settings.modelThinking}">${live2d_settings.modelThinking}</option>`);
                $('#model-thinking').val(live2d_settings.modelThinking);
            }
            
            if (!$('#model-normal').val() && data.models.length>0) {
                $('#model-normal').val(data.models[0]);
                live2d_settings.modelNormal = data.models[0];
            }
            if (!$('#model-thinking').val() && data.models.length>0) {
                $('#model-thinking').val(data.models[0]);
                live2d_settings.modelThinking = data.models[0];
            }
        } catch (e) {
            console.error("模型列表获取失败：", e);
            if (live2d_settings.modelNormal){
                $('#model-normal').html(`<option value="${live2d_settings.modelNormal}">${live2d_settings.modelNormal} (离线)</option>`);
                $('#model-normal').val(live2d_settings.modelNormal);
            }
            if (live2d_settings.modelThinking){
                $('#model-thinking').html(`<option value="${live2d_settings.modelThinking}">${live2d_settings.modelThinking} (离线)</option>`);
                $('#model-thinking').val(live2d_settings.modelThinking);
            }
        }
        if(btn) btn.text('刷新列表');
    }

    function getActiveModel(isThinkingMode) {
        var m = isThinkingMode ? live2d_settings.modelThinking : live2d_settings.modelNormal;
        return m || live2d_settings.modelNormal || live2d_settings.modelThinking;
    }

    // Chat 逻辑
    $('.waifu-tool .fui-star').click(function() {
        var chatBox = $('.waifu-chat-box');
        chatBox.slideToggle(200, function() {
            if (chatBox.is(':visible')) $('#waifu-input').focus();
        });
    });
    $('#waifu-send-btn').click(sendToLLM);
    $('#waifu-input').keydown(function(e) { if (e.keyCode === 13) sendToLLM(); });

    async function sendToLLM() {
        var input = $('#waifu-input');
        var text = input.val();
        if ((!text || text.trim() === '') && !currentImageBase64) return;
        input.val('');

        // 仅当历史面板未打开时收起聊天框
        if (!$('.waifu-history-panel').hasClass('open')) {
            $('.waifu-chat-box').slideUp(200);
        }

        appendHistoryItem('user', text, currentImageUrl); 

        // 3. 状态锁与提示
        live2d_settings.isLLMThinking = true;
        live2d_settings.isLLMWriting = true;
        showMessage("正在思考中... ( •̀ ω •́ )y", 0, true);
        live2d_settings.isLLMWriting = false;

        // 显示停止按钮
        $('.waifu-tool .fui-pause').show();

        var useThinking = live2d_settings.useThinkingWaifu;
        var modelToUse = getActiveModel(useThinking);

        console.log("Waifu Chat Model:", modelToUse);
        console.log("记忆开关:", live2d_settings.useMemory, "| 记忆轮数:", live2d_settings.memoryLimit);

        var messages = [];
        var systemContent = live2d_settings.waifuPrompt || "你是一个网页看板娘，请用简短、可爱的语气回答，不要超过50个字。";
        var systemPrompt = {"role": "system", "content": systemContent};
        
        // --- 历史记录读取与清洗 ---
        var history = []; // 用于保存回 LocalStorage 的原始数据 (含 URL)
        var messagesForAPI = []; // 用于发给 Ollama 的清洗后数据 (不含 URL)

        if (live2d_settings.useMemory) {
            try {
                var savedHistory = localStorage.getItem('waifu_chat_history');
                if (savedHistory) {
                    history = JSON.parse(savedHistory);
                    
                    // === 清洗逻辑开始 ===
                    // 遍历历史，将 image_url (URL格式) 剔除，只保留文本，防止 Ollama 报错
                    messagesForAPI = history.map(function(msg) {
                        // 浅拷贝，防止修改原始 history 数组
                        var newMsg = { role: msg.role };
                        
                        if (Array.isArray(msg.content)) {
                            // 如果是多模态数组，过滤掉 image_url 类型
                            var textParts = msg.content.filter(function(item) {
                                return item.type === 'text';
                            });
                            
                            // 提取文本内容
                            if (textParts.length > 0) {
                                newMsg.content = textParts[0].text; 
                            } else {
                                newMsg.content = "[用户发送了一张图片]"; // 占位符
                            }
                        } else {
                            // 纯文本直接保留
                            newMsg.content = msg.content;
                        }
                        return newMsg;
                    });
                    // === 清洗逻辑结束 ===
                }
            } catch (e) { console.error("对话历史加载失败：", e); }
        }

        // 构建当前用户消息 (使用 Base64)
        var userMessageContent;
        if (currentImageBase64) {
            userMessageContent = [
                { 
                    "type": "text", 
                    "text": text || "请描述这张图片" 
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": currentImageBase64 
                    }
                }
            ];
        } else {
            userMessageContent = text;
        }

        // 组装最终请求体
        messages.push(systemPrompt);
        messages = messages.concat(messagesForAPI); // 这里拼接的是清洗后的数据
        messages.push({"role": "user", "content": userMessageContent});

        try {
            llmAbortController = new AbortController(); 

            const response = await fetch(live2d_settings.llmApiUrl, {
                method: 'POST',
                signal: llmAbortController.signal,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + live2d_settings.llmApiKey },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: messages,
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) throw new Error('API Error: ' + response.status);
            const data = await response.json();

            if (data.choices && data.choices.length > 0) {
                let reply = data.choices[0].message.content;

                live2d_settings.isLLMWriting = true;
                showMessage(reply, 6000, true);

                appendHistoryItem('assistant', reply, null);
                
                // --- 保存历史记录 (存 URL) ---
                if (live2d_settings.useMemory) {
                    var storageUserMsg;

                    if (currentImageUrl) {
                        // 存 URL 到历史，节省空间
                        console.log("保存用户消息时包含图片 URL");
                        storageUserMsg = {
                            "role": "user",
                            "content": [
                                { "type": "text", "text": text || "[图片]" },
                                { "type": "image_url", "image_url": { "url": currentImageUrl } } 
                            ]
                        };
                    } else {
                        storageUserMsg = { "role": "user", "content": text };
                    }

                    // 推入新对话到原始 history (包含 URL)
                    history.push(storageUserMsg);
                    history.push({"role": "assistant", "content": reply});

                    // 限制条数
                    var limit = parseInt(live2d_settings.memoryLimit) || 10;
                    var maxMsgs = limit * 2;
                    console.log("当前历史长度:", history.length, "| 限制:", maxMsgs);
                    if (history.length > maxMsgs) {
                        history = history.slice(history.length - maxMsgs);
                        console.log("对话历史已截断至", maxMsgs, "条消息");
                    }
                    localStorage.setItem('waifu_chat_history', JSON.stringify(history));
                    console.log("对话历史已保存,共", history.length, "条消息");
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                live2d_settings.isLLMWriting = true;
                showMessage("思考被中止了(>_<)... ", 4000, true)
            } else {
                console.error("LLM Error:", error);
                live2d_settings.isLLMWriting = true;
                showMessage("呜呜，大脑短路了... ", 4000, true);
            }
        } finally {
            live2d_settings.isLLMThinking = false;
            live2d_settings.isLLMWriting = false;
            llmAbortController = null;
            $('.waifu-tool .fui-pause').hide(); // 隐藏停止按钮
            // TODO 清理图片数据，注释掉让用户不关闭图片时继续使用，加入设置？
            currentImageBase64 = null;
            currentImageUrl = null;
            $('#waifu-preview-close').click(); // 触发 UI 重置
        }
    }

    // Peek 逻辑
    $('.waifu-tool .fui-video').off('click').on('click', function() { doPeekAction(); });

    if (live2d_settings.autoRoast) {
        window.roastTimer = setInterval(function() {
            if (!live2d_settings.isLLMThinking) doPeekAction();
        }, live2d_settings.roastInterval);
        console.log('[Timer] 自动吐槽已开启，间隔: ' + live2d_settings.roastInterval + 'ms');
    }

    async function doPeekAction() {
        if (live2d_settings.isLLMThinking) return;

        live2d_settings.isLLMThinking = true;
        live2d_settings.isLLMWriting = true;

        // 根据模式显示不同的提示语
        if (live2d_settings.peekMode === 'chat') showMessage("截图收到！( •̀ ω •́ )✧ 正在认真分析中，请稍等一下下～", 0, true);
        else showMessage("让我看看你在干什么坏事... (盯)", 0, true);
       
        live2d_settings.isLLMWriting = false;

        // 显示停止按钮
        $('.waifu-tool .fui-pause').show();

        var useThinking = (live2d_settings.peekMode === 'chat' && live2d_settings.useThinkingChat) || (live2d_settings.peekMode === 'roast' && live2d_settings.useThinkingRoast);
        var modelToUse = getActiveModel(useThinking);

        console.log("Peek Model:", modelToUse, "| Mode:", live2d_settings.peekMode);

        try {
            var payload = {
                target_type: live2d_settings.targetType,
                target_hwid: parseInt(live2d_settings.targetHwid) || 0,
                mode: live2d_settings.peekMode,
                prompt: (live2d_settings.peekMode === 'chat') ? live2d_settings.chatPrompt : live2d_settings.roastPrompt,
                model: modelToUse
            };

            llmAbortController = new AbortController();

            const response = await fetch(live2d_settings.pythonServerUrl + 'see_and_roast', {
                signal: llmAbortController.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Python 后端连接异常');
            const data = await response.json();
           
            if (data.success === false) throw new Error(data.reply || "后端未知错误")

            live2d_settings.isLLMWriting = true;

            // 结果处理：聊天助手模式自动复制，吐槽模式直接显示
            if (live2d_settings.peekMode === 'chat') {
                showMessage("回复已经复制到剪贴板啦！\n" + data.reply, 5000, true);
            } else {
                showMessage(data.reply, 6000, true);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Peek请求被中止');
                live2d_settings.isLLMWriting = true;
                showMessage("好吧，那我不看就是了。", 4000, true)
            } else {
                console.error("Peek Error:", error);
                live2d_settings.isLLMWriting = true;
                showMessage("我看不到屏幕了... 是不是 Python 脚本没运行？", 4000, true)
            }
        } finally {
            // 解锁
            live2d_settings.isLLMThinking = false;
            live2d_settings.isLLMWriting = false;
            llmAbortController = null;
            $('.waifu-tool .fui-pause').hide(); // 隐藏停止按钮
        }
    }

    // ==========================================
    // [waifu-tips.js] 增强型模型数据导出器
    // ==========================================
    (function() {
        console.log("[Bridge] 初始化调试桥接...");

        var exportTimer = setInterval(function() {
            // 1. 环境检查
            if (typeof window.Live2DManager === 'undefined' || !window.Live2DManager.getModel(0)) {
                return;
            }
            
            var model = window.Live2DManager.getModel(0);
            if (!model.modelSetting || !model.modelSetting.json) return;

            // 2. 深度提取数据
            try {
                // --- A. 提取表情 (Expressions) ---
                var expressions = model.expressions ? Object.keys(model.expressions) : [];

                // --- B. 提取动作详细列表 (Motions) ---
                // 目标结构: { "idle": ["Breath1.mtn", "Breath2.mtn"], "tap_body": [...] }
                var motionDetail = {};
                var rawMotions = model.modelSetting.json.motions; 
                
                if (rawMotions) {
                    for (var group in rawMotions) {
                        var fileList = rawMotions[group];
                        // 仅提取文件名，方便展示
                        motionDetail[group] = fileList.map(function(item) {
                            // item.file 可能是 "motions/Breath1.mtn"
                            return item.file;
                        });
                    }
                }

                // 3. 写入 LocalStorage
                var debugInfo = {
                    expressions: expressions,
                    motions: motionDetail, // 注意：这里现在是一个对象，不是数组了
                    modelId: live2d_settings.modelId || 0,
                    timestamp: new Date().getTime()
                };
                
                localStorage.setItem('waifu_debug_info', JSON.stringify(debugInfo));
                
                clearInterval(exportTimer);
                setInterval(checkModelChange, 2000, model);
                
            } catch (e) {
                console.error("[Bridge] 数据提取失败:", e);
            }
        }, 1000);

        // 辅助：检测模型是否切换
        var currentModelRef = null;
        function checkModelChange(model) {
            if (window.Live2DManager.getModel(0) !== currentModelRef) {
                currentModelRef = window.Live2DManager.getModel(0);
                // location.reload(); // 简单处理：模型变了刷新页面重新加载逻辑
            }
        }

        // 4. 监听指令 (跨窗口)
        window.addEventListener('storage', function(e) {
            if (e.key === 'waifu_debug_command' && e.newValue) {
                var cmd = JSON.parse(e.newValue);
                executeDebugCommand(cmd);
            }
        });
    })();

    // --- 通用执行函数 (核心修改：支持指定 Index) ---
    window.executeDebugCommand = function(cmd) {
        var model = window.Live2DManager.getModel(0);
        if (!model) return;

        console.log("[Bridge] 执行指令:", cmd);

        if (cmd.type === 'expression') {
            model.setExpression(cmd.name);
            showMessage("调试表情: " + cmd.name, 1000, true);
        } 
        else if (cmd.type === 'motion') {
            // 如果指令里带了 index，就播放特定的文件
            if (cmd.index !== undefined) {
                // startMotion(组名, 索引, 优先级)
                // 优先级 3 (PRIORITY_NORMAL) 或 4 (PRIORITY_FORCE)
                model.startMotion(cmd.name, cmd.index, 3);
                showMessage("调试动作: " + cmd.filename, 1000, true);
            } else {
                // 旧逻辑兼容：随机播放
                model.startRandomMotion(cmd.name, 3);
            }
        }
    };
}

function loadModel(modelId, modelTexturesId=0) {
    modelId = parseInt(modelId);
    modelTexturesId = parseInt(modelTexturesId);
    console.log('[Debug] loadModel called with modelId:', modelId, 'texturesId:', modelTexturesId);
    
    if (live2d_settings.modelStorage) {
        localStorage.setItem('modelId', modelId);
        localStorage.setItem('modelTexturesId', modelTexturesId);
    } else {
        sessionStorage.setItem('modelId', modelId);
        sessionStorage.setItem('modelTexturesId', modelTexturesId);
    }
    
    loadlive2d('live2d', localAPI('get', modelId, modelTexturesId), 
        (live2d_settings.showF12Status ? console.log('[Status]','live2d','模型',modelId+'-'+modelTexturesId,'加载完成'):null));
}

function loadTipsMessage(result) {
    window.waifu_tips = result;
    
    $.each(result.mouseover, function (index, tips){
        $(document).on("mouseover", tips.selector, function (){
            var text = getRandText(tips.text);
            text = text.render({text: $(this).text()});
            showMessage(text, 3000);
        });
    });
    $.each(result.click, function (index, tips){
        $(document).on("click", tips.selector, function (){
            var text = getRandText(tips.text);
            text = text.render({text: $(this).text()});
            showMessage(text, 3000, true);
        });
    });
    $.each(result.seasons, function (index, tips){
        var now = new Date();
        var after = tips.date.split('-')[0];
        var before = tips.date.split('-')[1] || after;
        
        if((after.split('/')[0] <= now.getMonth()+1 && now.getMonth()+1 <= before.split('/')[0]) && 
           (after.split('/')[1] <= now.getDate() && now.getDate() <= before.split('/')[1])){
            var text = getRandText(tips.text);
            var cnYears = now.getFullYear() - 1949; 
            text = text.render({year: now.getFullYear(), cn_years: cnYears});
            showMessage(text, 6000, true);
            showMessage(text, 6000, true);
        }
    });
    
    if (live2d_settings.showF12OpenMsg) {
        re.toString = function() {
            showMessage(getRandText(result.waifu.console_open_msg), 5000, true);
            return '';
        };
    }
    
    if (live2d_settings.showCopyMessage) {
        $(document).on('copy', function() {
            showMessage(getRandText(result.waifu.copy_message), 5000, true);
        });
    }
    
    $('.waifu-tool .fui-photo').click(function(){
        showMessage(getRandText(result.waifu.screenshot_message), 5000, true);
        window.Live2D.captureName = live2d_settings.screenshotCaptureName;
        window.Live2D.captureFrame = true;
    });
    
    $('.waifu-tool .fui-cross').click(function(){
        sessionStorage.setItem('waifu-dsiplay', 'none');
        showMessage(getRandText(result.waifu.hidden_message), 1300, true);
        window.setTimeout(function() {$('.waifu').hide();}, 1300);
    });

    $('#btn-clear-memory').click(function() {
        if(confirm('确定要让看板娘忘记之前的所有对话吗？')) {
            window.resetChatMemory();
        }
    });

    window.resetChatMemory = function() {
        localStorage.removeItem('waifu_chat_history');
        showMessage("记忆已重置！我们可以重新认识一下啦~", 4000, true);
    }
    
    window.showWelcomeMessage = function(result) {
        var text;
        if (1) { // TODO window.location.href == live2d_settings.homePageUrl 目前是默认根据小时提示显示，此处应该增加设置？
            var now = (new Date()).getHours();
            if (now > 23 || now <= 5) text = getRandText(result.waifu.hour_tips['t23-5']);
            else if (now > 5 && now <= 7) text = getRandText(result.waifu.hour_tips['t5-7']);
            else if (now > 7 && now <= 11) text = getRandText(result.waifu.hour_tips['t7-11']);
            else if (now > 11 && now <= 14) text = getRandText(result.waifu.hour_tips['t11-14']);
            else if (now > 14 && now <= 17) text = getRandText(result.waifu.hour_tips['t14-17']);
            else if (now > 17 && now <= 19) text = getRandText(result.waifu.hour_tips['t17-19']);
            else if (now > 19 && now <= 21) text = getRandText(result.waifu.hour_tips['t19-21']);
            else if (now > 21 && now <= 23) text = getRandText(result.waifu.hour_tips['t21-23']);
            else text = getRandText(result.waifu.hour_tips.default);
        } else {
            var referrer_message = result.waifu.referrer_message;
            if (document.referrer !== '') {
                var referrer = document.createElement('a');
                referrer.href = document.referrer;
                if (window.location.hostname == referrer.hostname)
                    text = referrer_message.localhost[0] + document.title.split(referrer_message.localhost[2])[0] + referrer_message.localhost[1];
                else {
                    $.each(result.waifu.referrer_hostname, function(i,val) {if (i==referrer.hostname) referrer.hostname = getRandText(val)});
                    text = referrer_message.default[0] + referrer.hostname + referrer_message.default[1];
                }
            } else text = referrer_message.none[0] + document.title.split(referrer_message.none[2])[0] + referrer_message.none[1];
        }
        showMessage(text, 6000, true);
    }; if (live2d_settings.showWelcomeMessage) showWelcomeMessage(result);
    
    var waifu_tips = result.waifu;
    
    function loadOtherModel() {
        localAPI(live2d_settings.modelRandMode+'Model', live2d_settings.nowModelID);
    }
    
    function loadRandTextures() {
        localAPI(live2d_settings.modelTexturesRandMode+'Textures', live2d_settings.nowModelID, live2d_settings.nowTexturesID);
    }
    
    /* 检测用户活动状态，并在空闲时显示一言 */
    if (live2d_settings.showHitokoto) {
        window.getActed = false; window.hitokotoTimer = 0; window.hitokotoInterval = false;
        $(document).mousemove(function(e){getActed = true;}).keydown(function(){getActed = true;});
        setInterval(function(){ if (!getActed) ifActed(); else elseActed(); }, 1000);
    }
    
    function ifActed() {
        if (!hitokotoInterval) {
            hitokotoInterval = true;
            hitokotoTimer = window.setInterval(showHitokotoActed, 30000);
        }
    }
    
    function elseActed() {
        getActed = hitokotoInterval = false;
        window.clearInterval(hitokotoTimer);
    }
    
    function showHitokotoActed() {
        if ($(document)[0].visibilityState == 'visible') showHitokoto();
    }
    
    function showHitokoto() {
    	switch(live2d_settings.hitokotoAPI) {
    	    case 'lwl12.com':
    	        $.getJSON('https://api.lwl12.com/hitokoto/v1?encode=realjson',function(result){
        	        if (!empty(result.source)) {
                        var text = waifu_tips.hitokoto_api_message['lwl12.com'][0];
                        if (!empty(result.author)) text += waifu_tips.hitokoto_api_message['lwl12.com'][1];
                        text = text.render({source: result.source, creator: result.author});
                        window.setTimeout(function() {showMessage(result.text + text+waifu_tips.hitokoto_api_message['lwl12.com'][2], 7E3, true)});
                    }
                });break;
    	    case 'fghrsh.net':
    	        $.getJSON('https://api.fghrsh.net/hitokoto/rand/?encode=jsc&uid=3335',function(result){
            	    if (!empty(result.source)) {
                        var text = waifu_tips.hitokoto_api_message['fghrsh.net'][0];
                        text = text.render({source: result.source, date: result.date});
                        window.setTimeout(function() {showMessage(result.hitokoto + text, 7E3, true)});
            	    }
                });break;
            case 'jinrishici.com':
                $.ajax({
                    url: 'https://v2.jinrishici.com/one.json',
                    xhrFields: {withCredentials: true},
                    success: function (result, status) {
                        if (!empty(result.data.origin.title)) {
                            var text = waifu_tips.hitokoto_api_message['jinrishici.com'][0];
                            text = text.render({title: result.data.origin.title, dynasty: result.data.origin.dynasty, author:result.data.origin.author});
                            window.setTimeout(function() {showMessage(result.data.content + text, 7E3, true)});
                        }
                    }
                });break;
    	    default:
    	        $.getJSON('https://v1.hitokoto.cn',function(result){
            	    if (!empty(result.from)) {
                        var text = waifu_tips.hitokoto_api_message['hitokoto.cn'][0];
                        text = text.render({source: result.from, creator: result.creator});
                        window.setTimeout(function() {showMessage(result.hitokoto + text, 7E3, true)});
            	    }
                });
    	}
    }
    
    $('.waifu-tool .fui-eye').click(function (){loadOtherModel()});
    $('.waifu-tool .fui-user').click(function (){loadRandTextures()});
    $('.waifu-tool .fui-chat').click(function (){showHitokoto()});
}