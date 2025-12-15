window.live2d_settings = Array(); /*

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
    　　　　　 　　　'ｰ'　　!_,.:*********************************************************************************/


// 静态 API 文件
live2d_settings['staticAPIFile']        = 'live2d_api-master/model/static-api-file.json';
live2d_settings['staticPath']           = 'live2d_api-master/model/'
live2d_settings['defaultModel']         = '{"version":"1.0.0","model":"MODEL_HOME/Potion-Maker/Pio/model.moc","textures":["MODEL_HOME/Potion-Maker/Pio/textures/default-costume.png"],"layout":{"center_x":0.0,"center_y":-0.05,"width":2.0},"hit_areas_custom":{"head_x":[-0.35,0.6],"head_y":[0.19,-0.2],"body_x":[-0.3,-0.25],"body_y":[0.3,-0.9]},"motions":{"idle":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath7.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath8.mtn"}],"sleepy":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sleeping.mtn"}],"flick_head":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere6.mtn"}],"tap_body":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch6.mtn"}]}}'.replace(/MODEL_HOME/g, live2d_settings['staticPath']);

// 后端接口
live2d_settings['tipsMessage']          = 'waifu-tips.json';              // 同目录下可省略路径
live2d_settings['hitokotoAPI']          = 'hitokoto.cn';                  // 一言 API，可选 'lwl12.com', 'hitokoto.cn', 'jinrishici.com'(古诗词), 'fghrsh.net'

// 默认模型
live2d_settings['modelId']              = 0;            // 默认模型 ID，可在 F12 控制台找到
live2d_settings['modelTexturesId']      = 61;           // 默认材质 ID，可在 F12 控制台找到

// 工具栏设置
live2d_settings['showToolMenu']         = true;         // 显示 工具栏         ，可选 true(真), false(假)
live2d_settings['canCloseLive2d']       = false;        // 显示 关闭看板娘  按钮，可选 true(真), false(假)
live2d_settings['canSwitchModel']       = true;         // 显示 模型切换    按钮，可选 true(真), false(假)
live2d_settings['canSwitchTextures']    = true;         // 显示 材质切换    按钮，可选 true(真), false(假)
live2d_settings['canSwitchHitokoto']    = true;         // 显示 一言切换    按钮，可选 true(真), false(假)
live2d_settings['canTakeScreenshot']    = false;        // 显示 看板娘截图  按钮，可选 true(真), false(假)
live2d_settings['canTurnToHomePage']    = false;        // 显示 返回首页    按钮，可选 true(真), false(假)
live2d_settings['canTurnToAboutPage']   = false;        // 显示 跳转关于页  按钮，可选 true(真), false(假)
live2d_settings['showLLM']              = true;         // 启用 LLM 对话功能，可选 true(真), false(假)
live2d_settings['showPeek']             = true;         // 启用手动点击截图功能，可选 true(真), false(假)
live2d_settings['showSettings']         = true;         // 启用设置功能，可选 true(真), false(假)

// 模型切换模式
live2d_settings['modelStorage']         = true;         // 记录 ID (刷新后恢复)，可选 true(真), false(假)
live2d_settings['modelRandMode']        = 'switch';     // 模型切换，可选 'rand'(随机), 'switch'(顺序)
live2d_settings['modelTexturesRandMode']= 'rand';       // 材质切换，可选 'rand'(随机), 'switch'(顺序)

// 提示消息选项
live2d_settings['showHitokoto']         = true;         // 显示一言
live2d_settings['showF12Status']        = true;         // 显示加载状态
live2d_settings['showF12Message']       = true;         // 显示看板娘消息
live2d_settings['showF12OpenMsg']       = true;         // 显示控制台打开提示
live2d_settings['showCopyMessage']      = true;         // 显示 复制内容 提示
live2d_settings['showWelcomeMessage']   = true;         // 显示进入面页欢迎词

//看板娘样式设置
live2d_settings['waifuSize']            = '280x250';    // 看板娘大小，例如 '280x250', '600x535'
live2d_settings['waifuTipsSize']        = '250x75';     // 提示框大小，例如 '250x70', '570x150'
live2d_settings['waifuFontSize']        = '12px';       // 提示框字体，例如 '12px', '30px'
live2d_settings['waifuToolFont']        = '14px';       // 工具栏字体，例如 '14px', '36px'
live2d_settings['waifuToolLine']        = '20px';       // 工具栏行高，例如 '20px', '36px'
live2d_settings['waifuToolTop']         = '-20px'       // 工具栏顶部边距，例如 '0px', '-60px'
live2d_settings['waifuMinWidth']        = 'disable';    // 面页小于 指定宽度 隐藏看板娘，例如 'disable'(禁用), '768px'
live2d_settings['waifuEdgeSide']        = 'left:0';     // 看板娘贴边方向，例如 'left:0'(靠左 0px), 'right:30'(靠右 30px)
live2d_settings['waifuDraggable']       = 'disable';    // 拖拽样式，例如 'disable'(禁用), 'axis-x'(只能水平拖拽), 'unlimited'(自由拖拽)
live2d_settings['waifuDraggableRevert'] = true;         // 松开鼠标还原拖拽位置，可选 true(真), false(假)

// 其他杂项设置
live2d_settings['l2dVersion']           = '1.4.3';      // 当前版本
live2d_settings['l2dVerDate']           = '2018.11.12'; // 版本更新日期
live2d_settings['homePageUrl']          = 'auto';       // 主页地址，可选 'auto'(自动), '{URL 网址}'
live2d_settings['aboutPageUrl']         = 'https://www.fghrsh.net/post/123.html';   // 关于页地址, '{URL 网址}'
live2d_settings['screenshotCaptureName']= 'live2d.png'; // 看板娘截图文件名，例如 'live2d.png'

live2d_settings['nowModelID']           = 0;
live2d_settings['nowTexturesID']        = 0;

// LLM对话设置

live2d_settings['llmApiUrl']            = 'http://127.0.0.1:11434/v1/chat/completions'; // API
live2d_settings['llmApiKey']            = '';           // Key
// Peek (屏幕吐槽) 设置
live2d_settings['pythonServerUrl']      = 'http://127.0.0.1:11542/';
// --- 自动定时吐槽设置 ---
live2d_settings['autoRoast']            = false;        // 是否开启自动定时截图吐槽 (true: 开启, false: 关闭)
live2d_settings['roastInterval']        = 60000;        // 自动吐槽间隔 (单位: 毫秒)，300000 = 5分钟

try {
    var saved = localStorage.getItem('waifu_global_settings');
    if (saved) {
        $.extend(live2d_settings, JSON.parse(saved));
    }
} catch (e) { console.log('Settings Load Error', e); }
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

function localAPI(action, modelID, texturesID=0){
    //modelID = modelID>0 ? modelID-1 : 0;
    //texturesID = texturesID>0 ? texturesID-1 : 0;
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
    } else if (action === 'randTextures'){
        let totalTexturesNum;
        if(typeof staticAPI.model_list.models[modelID] === 'string'){
            totalTexturesNum = staticAPI.Textures[modelID].length;
        } else {
            totalTexturesNum = staticAPI.model_list.models[modelID].length;
        }
        let newTextureID = Math.floor(Math.random()*totalTexturesNum);
        while(newTextureID === texturesID){
            newTextureID = Math.floor(Math.random()*totalTexturesNum);
        }
        loadModel(modelID, newTextureID);
    } else if (action === 'switchTextures'){
        let totalTexturesNum;
        if(typeof staticAPI.model_list.models[modelID] === 'string'){
            totalTexturesNum = staticAPI.Textures[modelID].length;
        } else {
            totalTexturesNum = staticAPI.model_list.models[modelID].length;
        }
        let newTextureID = TexturesID + 1;
        if(newTextureID >= totalTexturesNum && newTextureID !== 0){
            newTextureID = 0;
        }
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
    //       新增：全局设置面板绑定逻辑
    // ==========================================
    $(document).ready(function() {
        // 初始化设置面板
        initSettingsPanel();
        window.addEventListener('storage', function(e) {
            if (e.key === 'waifu_global_settings' || e.key === 'waifu_llm_settings') {
                console.log('检测到设置变更，正在同步...');
                
                // 重新读取配置
                try {
                    var saved = localStorage.getItem('waifu_global_settings');
                    if (saved) $.extend(live2d_settings, JSON.parse(saved));
                    
                    // 重新应用设置 (调用之前我给你的辅助函数)
                    // 注意：你需要遍历 live2d_settings 的 key 来应用，或者只针对关键设置做处理
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
        // 1. Tab 选项卡切换逻辑
        $('.settings-tab-item').click(function() {
            var tabId = $(this).data('tab');
            // 切换 Tab 样式
            $('.settings-tab-item').removeClass('active');
            $(this).addClass('active');
            // 切换内容显示
            $('.tab-pane').hide();
            $('#tab-' + tabId).show();
        });

        // 2. 读取本地存储的全局设置 (如果存在)
        var savedGlobalSettings = localStorage.getItem('waifu_global_settings');
        if (savedGlobalSettings) {
            var parsedSettings = JSON.parse(savedGlobalSettings);
            $.extend(live2d_settings, parsedSettings);
        }

        // 3. 将 JS 变量的值填充到 HTML 控件中 (初始化 UI)
        $('.config-item').each(function() {
            var key = $(this).data('key');     // 获取 data-key="xxx"
            var val = live2d_settings[key];    // 从全局变量获取当前值

            if (key && val !== undefined) {
                // 特殊处理：看板娘尺寸在 initModel 中被转换成了数组，这里需要转回字符串显示
                if ((key === 'waifuSize' || key === 'waifuTipsSize') && Array.isArray(val)) {
                    val = val[0] + 'x' + val[1];
                }

                // 根据 input 类型赋值
                if ($(this).attr('type') === 'checkbox') {
                    $(this).prop('checked', val);
                } else {
                    $(this).val(val);
                }
            }
        });

        // 4. 监听用户修改设置，更新 JS 变量并保存
        $('.config-item').change(function() {
            var $input = $(this);
            var key = $input.data('key');
            var val;

            // 获取值
            if ($input.attr('type') === 'checkbox') {
                val = $input.is(':checked');
            } else {
                val = $input.val();
            }

            // 更新全局变量
            // 注意：尺寸类设置通常需要刷新网页生效，这里暂时只存字符串
            live2d_settings[key] = val;

            // 立即应用部分 UI 变化 (即时反馈)
            applyImmediateChanges(key, val);

            // 保存所有 config-item 到 LocalStorage
            saveGlobalSettings();
        });

        // 打开/关闭设置面板的通用逻辑
        $('.waifu-tool .fui-gear').click(function() {
            $('.waifu-settings-panel').addClass('open');
        });
        $('.settings-close').click(function() {
            $('.waifu-settings-panel').removeClass('open');
        });
    }

    // 辅助函数：保存配置
    function saveGlobalSettings() {
        var settingsToSave = {};
        $('.config-item').each(function() {
            var key = $(this).data('key');
            if ($(this).attr('type') === 'checkbox') {
                settingsToSave[key] = $(this).is(':checked');
            } else {
                settingsToSave[key] = $(this).val();
            }
        });
        localStorage.setItem('waifu_global_settings', JSON.stringify(settingsToSave));
    }

    // 辅助函数：处理那些不需要刷新就能生效的设置
    function applyImmediateChanges(key, val) {
        // 工具栏按钮的显示/隐藏
        if (key === 'showToolMenu') val ? $('.waifu-tool').show() : $('.waifu-tool').hide();
        if (key === 'canTurnToHomePage') val ? $('.waifu-tool .fui-home').show() : $('.waifu-tool .fui-home').hide();
        if (key === 'canSwitchHitokoto') val ? $('.waifu-tool .fui-chat').show() : $('.waifu-tool .fui-chat').hide();
        if (key === 'canSwitchModel') val ? $('.waifu-tool .fui-eye').show() : $('.waifu-tool .fui-eye').hide();
        if (key === 'canSwitchTextures') val ? $('.waifu-tool .fui-user').show() : $('.waifu-tool .fui-user').hide();
        if (key === 'canTakeScreenshot') val ? $('.waifu-tool .fui-photo').show() : $('.waifu-tool .fui-photo').hide();
        if (key === 'canTurnToAboutPage') val ? $('.waifu-tool .fui-info-circle').show() : $('.waifu-tool .fui-info-circle').hide();
        if (key === 'canCloseLive2d') val ? $('.waifu-tool .fui-cross').show() : $('.waifu-tool .fui-cross').hide();
        
        // 扩展功能按钮
        if (key === 'showLLM') val ? $('.waifu-tool .fui-star').show() : $('.waifu-tool .fui-star').hide();
        if (key === 'showPeek') val ? $('.waifu-tool .fui-video').show() : $('.waifu-tool .fui-video').hide();
        if (key === 'showSettings') val ? $('.waifu-tool .fui-gear').show() : $('.waifu-tool .fui-gear').hide();
        
        // 样式微调
        if (key === 'waifuDraggable') {
            // 拖拽设置改变通常需要重新初始化 jQuery UI draggable，这里建议提示刷新
            // 或者简单处理禁用
            if (val === 'disable') $(".waifu").draggable('disable');
            else $(".waifu").draggable('enable');
        }
    }

    // 等待 staticAPI 加载完成
    if (!staticAPILoaded) {
        console.log('[Info] Waiting for static API to load...');
        setTimeout(function() {
            initModel(waifuPath, type);
        }, 100);
        return;
    }

    /* console welcome message */
    eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('8.d(" ");8.d("\\U,.\\y\\5.\\1\\1\\1\\1/\\1,\\u\\2 \\H\\n\\1\\1\\1\\1\\1\\b \', !-\\r\\j-i\\1/\\1/\\g\\n\\1\\1\\1 \\1 \\a\\4\\f\'\\1\\1\\1 L/\\a\\4\\5\\2\\n\\1\\1 \\1 /\\1 \\a,\\1 /|\\1 ,\\1 ,\\1\\1\\1 \',\\n\\1\\1\\1\\q \\1/ /-\\j/\\1\\h\\E \\9 \\5!\\1 i\\n\\1\\1\\1 \\3 \\6 7\\q\\4\\c\\1 \\3\'\\s-\\c\\2!\\t|\\1 |\\n\\1\\1\\1\\1 !,/7 \'0\'\\1\\1 \\X\\w| \\1 |\\1\\1\\1\\n\\1\\1\\1\\1 |.\\x\\"\\1\\l\\1\\1 ,,,, / |./ \\1 |\\n\\1\\1\\1\\1 \\3\'| i\\z.\\2,,A\\l,.\\B / \\1.i \\1|\\n\\1\\1\\1\\1\\1 \\3\'| | / C\\D/\\3\'\\5,\\1\\9.\\1|\\n\\1\\1\\1\\1\\1\\1 | |/i \\m|/\\1 i\\1,.\\6 |\\F\\1|\\n\\1\\1\\1\\1\\1\\1.|/ /\\1\\h\\G \\1 \\6!\\1\\1\\b\\1|\\n\\1\\1\\1 \\1 \\1 k\\5>\\2\\9 \\1 o,.\\6\\2 \\1 /\\2!\\n\\1\\1\\1\\1\\1\\1 !\'\\m//\\4\\I\\g\', \\b \\4\'7\'\\J\'\\n\\1\\1\\1\\1\\1\\1 \\3\'\\K|M,p,\\O\\3|\\P\\n\\1\\1\\1\\1\\1 \\1\\1\\1\\c-,/\\1|p./\\n\\1\\1\\1\\1\\1 \\1\\1\\1\'\\f\'\\1\\1!o,.:\\Q \\R\\S\\T v"+e.V+" / W "+e.N);8.d(" ");',60,60,'|u3000|uff64|uff9a|uff40|u30fd|uff8d||console|uff8a|uff0f|uff3c|uff84|log|live2d_settings|uff70|u00b4|uff49||u2010||u3000_|u3008||_|___|uff72|u2500|uff67|u30cf|u30fc||u30bd|u4ece|u30d8|uff1e|__|u30a4|k_|uff17_|u3000L_|u3000i|uff1a|u3009|uff34|uff70r|u30fdL__||___i|l2dVerDate|u30f3|u30ce|nLive2D|u770b|u677f|u5a18|u304f__|l2dVersion|FGHRSH|u00b40i'.split('|'),0,{}));
    
    /* 判断 JQuery */
    if (typeof($.ajax) != 'function') typeof(jQuery.ajax) == 'function' ? window.$ = jQuery : console.log('[Error] JQuery is not defined.');
    
    /* 加载看板娘样式 */
    live2d_settings.waifuSize = live2d_settings.waifuSize.split('x');
    live2d_settings.waifuTipsSize = live2d_settings.waifuTipsSize.split('x');
    live2d_settings.waifuEdgeSide = live2d_settings.waifuEdgeSide.split(':');
    
    $("#live2d").attr("width",live2d_settings.waifuSize[0]);
    $("#live2d").attr("height",live2d_settings.waifuSize[1]);
    $(".waifu-tips").width(live2d_settings.waifuTipsSize[0]);
    $(".waifu-tips").height(live2d_settings.waifuTipsSize[1]);
    $(".waifu-tips").css("top",live2d_settings.waifuToolTop);
    $(".waifu-tips").css("font-size",live2d_settings.waifuFontSize);
    $(".waifu-tool").css("font-size",live2d_settings.waifuToolFont);
    $(".waifu-tool span").css("line-height",live2d_settings.waifuToolLine);
    
    if (live2d_settings.waifuEdgeSide[0] == 'left') $(".waifu").css("left",live2d_settings.waifuEdgeSide[1]+'px');
    else if (live2d_settings.waifuEdgeSide[0] == 'right') $(".waifu").css("right",live2d_settings.waifuEdgeSide[1]+'px');
    
    window.waifuResize = function() { $(window).width() <= Number(live2d_settings.waifuMinWidth.replace('px','')) ? $(".waifu").hide() : $(".waifu").show(); };
    if (live2d_settings.waifuMinWidth != 'disable') { waifuResize(); $(window).resize(function() {waifuResize()}); }
    
    try {
        if (live2d_settings.waifuDraggable == 'axis-x') $(".waifu").draggable({ axis: "x", revert: live2d_settings.waifuDraggableRevert });
        else if (live2d_settings.waifuDraggable == 'unlimited') $(".waifu").draggable({ revert: live2d_settings.waifuDraggableRevert });
        else $(".waifu").css("transition", 'all .3s ease-in-out');
    } catch(err) { console.log('[Error] JQuery UI is not defined.') }
    
    live2d_settings.homePageUrl == 'auto' ? window.location.protocol+'//'+window.location.hostname+'/' : live2d_settings.homePageUrl;
    if (window.location.protocol == 'file:' && live2d_settings.modelAPI.substr(0,2) == '//') live2d_settings.modelAPI = 'http:'+live2d_settings.modelAPI;
    
    $('.waifu-tool .fui-home').click(function (){
        //window.location = 'https://www.fghrsh.net/';
        window.location = live2d_settings.homePageUrl;
    });
    
    $('.waifu-tool .fui-info-circle').click(function (){
        //window.open('https://imjad.cn/archives/lab/add-dynamic-poster-girl-with-live2d-to-your-blog-02');
        window.open(live2d_settings.aboutPageUrl);
    });
    
    if (typeof(waifuPath) == "object") loadTipsMessage(waifuPath); else {
        $.ajax({
            cache: true,
            url: waifuPath == '' ? live2d_settings.tipsMessage : (waifuPath.substr(waifuPath.length-15)=='waifu-tips.json'?waifuPath:waifuPath+'waifu-tips.json'),
            dataType: "json",
            success: function (result){ loadTipsMessage(result); }
        });
    }
    
    // 按钮控件显示与隐藏
    if (!live2d_settings.showToolMenu) $('.waifu-tool').hide();
    if (!live2d_settings.canCloseLive2d) $('.waifu-tool .fui-cross').hide();
    if (!live2d_settings.canSwitchModel) $('.waifu-tool .fui-eye').hide();
    if (!live2d_settings.canSwitchTextures) $('.waifu-tool .fui-user').hide();
    if (!live2d_settings.canSwitchHitokoto) $('.waifu-tool .fui-chat').hide();
    if (!live2d_settings.canTakeScreenshot) $('.waifu-tool .fui-photo').hide();
    if (!live2d_settings.canTurnToHomePage) $('.waifu-tool .fui-home').hide();
    if (!live2d_settings.canTurnToAboutPage) $('.waifu-tool .fui-info-circle').hide();
    if (!live2d_settings.showLLM) $('.waifu-tool .fui-brain').hide();
    if (!live2d_settings.showPeek) $('.waifu-tool .fui-camera').hide();
    if (!live2d_settings.showSettings) $('.waifu-tool .fui-gear').hide();

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
}

function loadModel(modelId, modelTexturesId=0) {
    // 确保是数字类型
    modelId = parseInt(modelId);
    modelTexturesId = parseInt(modelTexturesId);
    
    console.log('[Debug] loadModel called with modelId:', modelId, 'texturesId:', modelTexturesId);
    
    if (live2d_settings.modelStorage) {
        localStorage.setItem('modelId', modelId);
        localStorage.setItem('modelTexturesId', modelTexturesId);
        console.log('[Debug] Saved to localStorage');
    } else {
        sessionStorage.setItem('modelId', modelId);
        sessionStorage.setItem('modelTexturesId', modelTexturesId);
        console.log('[Debug] Saved to sessionStorage');
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
            text = text.render({year: now.getFullYear()});
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
        if (window.location.href == live2d_settings.homePageUrl) {
            var now = (new Date()).getHours();
            if (now > 23 || now <= 5) text = getRandText(result.waifu.hour_tips.t23-5);
            else if (now > 5 && now <= 7) text = getRandText(result.waifu.hour_tips.t5-7);
            else if (now > 7 && now <= 11) text = getRandText(result.waifu.hour_tips.t7-11);
            else if (now > 11 && now <= 14) text = getRandText(result.waifu.hour_tips.t11-14);
            else if (now > 14 && now <= 17) text = getRandText(result.waifu.hour_tips.t14-17);
            else if (now > 17 && now <= 19) text = getRandText(result.waifu.hour_tips.t17-19);
            else if (now > 19 && now <= 21) text = getRandText(result.waifu.hour_tips.t19-21);
            else if (now > 21 && now <= 23) text = getRandText(result.waifu.hour_tips.t21-23);
            else text = getRandText(result.waifu.hour_tips.default);
        } else {
            var referrer_message = result.waifu.referrer_message;
            if (document.referrer !== '') {
                var referrer = document.createElement('a');
                referrer.href = document.referrer;
                var domain = referrer.hostname.split('.')[1];
                if (window.location.hostname == referrer.hostname)
                    text = referrer_message.localhost[0] + document.title.split(referrer_message.localhost[2])[0] + referrer_message.localhost[1];
                else {
                    $.each(result.waifu.referrer_hostname, function(i,val) {if (i==referrer.hostname) referrer.hostname = getRandText(val)});
                    text = referrer_message.default[0] + referrer.hostname + referrer_message.default[1];
                }
            } else text = referrer_message.none[0] + document.title.split(referrer_message.none[2])[0] + referrer_message.none[1];
        }
        showMessage(text, 6000);
    }; if (live2d_settings.showWelcomeMessage) showWelcomeMessage(result);
    
    var waifu_tips = result.waifu;
    
    function loadOtherModel() {
        localAPI(live2d_settings.modelRandMode+'Model', live2d_settings.nowModelID);
    }
    
    function loadRandTextures() {
        localAPI(live2d_settings.modelTexturesRandMode+'Textures', live2d_settings.nowModelID, live2d_settings.nowTexturesID);
    }
    
    function modelStorageGetItem(key) { return live2d_settings.modelStorage ? localStorage.getItem(key) : sessionStorage.getItem(key); }
    
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

    // ==========================================
    //       新增：LLM 大模型对话逻辑 & 设置面板
    // ==========================================

    // --- A. 设置面板与数据管理逻辑 (新增) ---
    
    // 默认配置
    var defaultSettings = {
        // 模型选择
        modelNormal: '',
        modelThinking: '',
        // 功能开关
        useThinkingWaifu: false,
        useThinkingChat: true,   // 聊天助手默认开思考
        useThinkingRoast: false,
        // Peek 设置
        targetType: 'fullscreen',
        targetHwid: 0,
        peekMode: 'roast',
        roastPrompt: `你是一个住在用户电脑桌面上的可爱看板娘。这是用户当前的屏幕截图。\n
用户当前正在操作的窗口是：'/window_title'。\n
背景里挂着的窗口还有：/window_list。\n\n
请根据屏幕内容和窗口判断用户正在做什么，并以**女朋友或贴心助手**的口吻直接对用户说话（使用第二人称‘你’）。\n
要求：\n
1. 不要描述画面内容，直接开启话题。\n
2. 这是一个猜测互动的过程。\n
3. 语气要软萌、可爱、充满元气。\n
4. 字数控制在50字以内。`,
        chatPrompt: `你是一个智能聊天助手。当前窗口是 '/window_title'。\n
请阅读图片中的聊天记录或文本内容，结合上下文，生成一个合适的、高情商的回复。\n
请直接给出你此刻会发送的那一句话，你的回复应像真人在即时聊天中自然打出的内容，不要包含解释。`,
        // 记忆设置
        useMemory: true,
        memoryLimit: 10
    };
    // 读取设置
    function loadAllSettings() {
        var saved = localStorage.getItem('waifu_llm_settings');
        if (saved) return $.extend({}, defaultSettings, JSON.parse(saved));
        return defaultSettings;
    }
    // 保存设置
    function saveAllSettings() {
        var current = {
            modelNormal: $('#model-normal').val(),
            modelThinking: $('#model-thinking').val(),
            useThinkingWaifu: $('#use-thinking-waifu').is(':checked'),
            useThinkingChat: $('#use-thinking-chat').is(':checked'),
            useThinkingRoast: $('#use-thinking-roast').is(':checked'),
            targetType: $('#peek-target-type').val(),
            targetHwid: $('#peek-window-list').val(),
            peekMode: $('#peek-mode').val(),
            roastPrompt: $('#prompt-roast').val(),
            chatPrompt: $('#prompt-chat').val(),
            useMemory: $('#use-memory').is(':checked'),
            memoryLimit: $('#memory-limit').val()
        };
        localStorage.setItem('waifu_llm_settings', JSON.stringify(current));
        return current;
    }

    var cfg = loadAllSettings();

    $(document).ready(function() {
        // 恢复开关状态
        $('#use-thinking-waifu').prop('checked', cfg.useThinkingWaifu);
        $('#use-thinking-chat').prop('checked', cfg.useThinkingChat);
        $('#use-thinking-roast').prop('checked', cfg.useThinkingRoast);
        
        // 恢复 Peek 设置
        $('#peek-mode').val(cfg.peekMode);
        $('#peek-target-type').val(cfg.targetType);
        
        // 恢复提示词 (如果有值)
        if (!$('#prompt-roast').val()) $('#prompt-roast').val(cfg.roastPrompt);
        if (!$('#prompt-chat').val()) $('#prompt-chat').val(cfg.chatPrompt);

        // 回复记忆设置
        $('#use-memory').prop('checked', cfg.useMemory !== false); // 默认开启(如果不为false)
        $('#memory-limit').val(cfg.memoryLimit || 10); // 默认10轮

        toggleUI();
        
        // 尝试获取模型列表并恢复选择
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
    // 4. 绑定设置面板事件
    // 打开/关闭面板
    $('.waifu-tool .fui-gear').click(function() { $('.waifu-settings-panel').addClass('open'); });
    $('.settings-close').click(function() { 
        $('.waifu-settings-panel').removeClass('open'); 
        saveAllSettings(); 
    });
    // 监听变动
    $('.waifu-settings-panel input, .waifu-settings-panel select, .waifu-settings-panel textarea').change(function() {
        toggleUI();
        saveAllSettings();
    });
    // 刷新模型列表
    $('#btn-refresh-models').click(function() {
        $(this).text('刷新中...');
        fetchModelList($(this));
    });
    // 重置提示词
    $('#btn-reset-roast').click(function() {
        if(confirm('重置吐槽提示词？')) { $('#prompt-roast').val(defaultSettings.roastPrompt); saveAllSettings(); }
    });
    $('#btn-reset-chat').click(function() {
        if(confirm('重置助手提示词？')) { $('#prompt-chat').val(defaultSettings.chatPrompt); saveAllSettings(); }
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
            
            // 恢复选中的窗口（如果有）
            var savedLLM = JSON.parse(localStorage.getItem('waifu_llm_settings') || '{}');
            if(savedLLM.targetHwid) $('#peek-window-list').val(savedLLM.targetHwid);
            
        } catch (e) {
            alert('获取窗口失败'); // 自动加载时最好别弹窗
            console.log(e)
        }
        $btn.text('刷新');
    });

    setTimeout(function() {
        if ($('input[data-key="pythonServerUrl"]').val()) {
            fetchModelList();
            $('#btn-refresh-windows').click(); 
        }
    }, 100);
    
    
    // 获取模型列表
    async function fetchModelList(btn) {
        try {
            // 调用 Python 后端代理接口
            var url = live2d_settings.pythonServerUrl + 'list_models';
            const response = await fetch(url);
            const data = await response.json();
            
            var optionsHtml = '';
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => { optionsHtml += `<option value="${m}">${m}</option>`; });
            } else {
                optionsHtml = '<option value="">未找到模型</option>';
            }
            // 填充两个下拉框
            $('#model-normal').html(optionsHtml);
            $('#model-thinking').html(optionsHtml);
            // 恢复之前的选择
            if (cfg.modelNormal) $('#model-normal').val(cfg.modelNormal);
            if (cfg.modelThinking) $('#model-thinking').val(cfg.modelThinking);
            
            // 如果之前没选，默认选列表第一个
            if (!$('#model-normal').val() && data.models.length>0) $('#model-normal').val(data.models[0]);
            if (!$('#model-thinking').val() && data.models.length>0) $('#model-thinking').val(data.models[0]);
        } catch (e) {
            console.error("Fetch Models Error:", e);
        }
        if(btn) btn.text('刷新列表');
    }
    // 获取当前应该使用的模型 (Normal vs Thinking)
    function getActiveModel(isThinkingMode) {
        // 获取最新配置
        var s = saveAllSettings();
        var m = isThinkingMode ? s.modelThinking : s.modelNormal;
        // 如果思考模型没选，回退到普通模型，反之亦然
        return m || s.modelNormal || s.modelThinking || live2d_settings.llmModel;
    }
    // === 逻辑 1: 看板娘日常对话 (Waifu Chat) ===
    // 点击星星：切换底部输入栏的显示状态
    $('.waifu-tool .fui-star').click(function() {
        var chatBox = $('.waifu-chat-box');
        chatBox.slideToggle(200, function() {
            if (chatBox.is(':visible')) $('#waifu-input').focus();
        });
    });
    $('#waifu-send-btn').click(sendToLLM);
    $('#waifu-input').keydown(function(e) { if (e.keyCode === 13) sendToLLM(); });
    // 3. 发送逻辑
    async function sendToLLM() {
        var input = $('#waifu-input');
        var text = input.val();
        if (!text || text.trim() === '') return;

        var cfg = saveAllSettings(); // 获取最新配置
        
        // 清空输入框并隐藏
        input.val('');
        $('.waifu-chat-box').slideUp(200);
        // === 思考状态锁 ===
        live2d_settings.isLLMThinking = true; // 开启全局锁，屏蔽一言和触摸
        live2d_settings.isLLMWriting = true;  // 临时允许写入（为了显示“思考中”）
        // 显示思考中 (timeout 设为 0 表示不自动消失)
        showMessage("正在思考中... ( •̀ ω •́ )y", 0, true);
        live2d_settings.isLLMWriting = false; // 写入完毕，锁定，防止其他干扰
        // 决定使用哪个模型
        var useThinking = cfg.useThinkingWaifu;
        var modelToUse = getActiveModel(useThinking);
        console.log("Waifu Chat Model:", modelToUse);

        console.log("记忆开关:", cfg.useMemory, "| 记忆轮数:", cfg.memoryLimit);

        var messages = [];
        var systemPrompt = {"role": "system", "content": "你是一个网页看板娘，请用简短、可爱的语气回答，不要超过50个字。"};

        // 1. 读取历史
        var history = [];
        if (cfg.useMemory) {
            try {
                var savedHistory = localStorage.getItem('waifu_chat_history');
                if (savedHistory) {
                    history = JSON.parse(savedHistory);
                }
            } catch (e) { console.error("对话历史加载失败：", e); }
        }

        // 2. 构建本次请求的消息列表 (System + History + Current User)
        messages.push(systemPrompt);
        messages = messages.concat(history);
        messages.push({"role": "user", "content": text});

        try {
            const response = await fetch(live2d_settings.llmApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + live2d_settings.llmApiKey },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: messages, // 发送包含历史的消息组
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) throw new Error('API Error: ' + response.status);
            const data = await response.json();

            if (data.choices && data.choices.length > 0) {
                let reply = data.choices[0].message.content;
                // === 准备显示回复，临时开启写入权限 ===
                live2d_settings.isLLMWriting = true;
                showMessage(reply, 6000, true);
                if (cfg.useMemory) {
                    // 推入新对话
                    history.push({"role": "user", "content": text});
                    history.push({"role": "assistant", "content": reply});

                    // 限制条数 (1轮 = 2条消息)
                    var limit = parseInt(cfg.memoryLimit) || 10;
                    var maxMsgs = limit * 2;

                    console.log("当前历史长度:", history.length, "| 限制:", maxMsgs);
                    
                    // 如果超出限制，保留最近的 N 条
                    if (history.length > maxMsgs) {
                        history = history.slice(history.length - maxMsgs);
                        console.log("对话历史已截断至", maxMsgs, "条消息");
                    }

                    localStorage.setItem('waifu_chat_history', JSON.stringify(history));
                    console.log("对话历史已保存,共", history.length, "条消息");
                }
            }
        } catch (error) {
            console.error("LLM Error:", error);
            live2d_settings.isLLMWriting = true;
            showMessage("呜呜，大脑短路了... 请检查连接配置", 4000, true);
            // 出错时，把刚刚存进去的用户消息删掉，防止下次请求带上错误的上下文
            if (history.length > 0) history.pop(); 
            localStorage.setItem('waifu_chat_history', JSON.stringify(history));
        } finally {
            live2d_settings.isLLMThinking = false; // 解除锁，恢复一言和触摸
            live2d_settings.isLLMWriting = false;
        }
    }
    // --- 逻辑 2: 升级版的 Peek 逻辑 ---
    
    // 1. 绑定相机图标点击事件 (使用新的 doPeekAction)
    $('.waifu-tool .fui-video').off('click').on('click', function() { doPeekAction(); });
    // 2. 根据配置自动启动定时器
    if (live2d_settings.autoRoast) {
        window.roastTimer = setInterval(function() {
            if (!live2d_settings.isLLMThinking) doPeekAction();
        }, live2d_settings.roastInterval);
        console.log('[Timer] 自动吐槽已开启，间隔: ' + live2d_settings.roastInterval + 'ms');
    }
    // 3. 核心处理函数 (原 analyzeScreen 的升级版)
    async function doPeekAction() {
       // 检查是否在思考中
       if (live2d_settings.isLLMThinking) return;

       // 获取当前设置
       var cfg = saveAllSettings(); // 获取最新配置
       // 锁定状态
       live2d_settings.isLLMThinking = true;
       live2d_settings.isLLMWriting = true;

       // 根据模式显示不同的提示语
       if (cfg.peekMode === 'chat') showMessage("截图收到！( •̀ ω •́ )✧ 正在认真分析中，请稍等一下下～", 0, true);
       else showMessage("让我看看你在干什么坏事... (盯)", 0, true);
       
       live2d_settings.isLLMWriting = false;

       var useThinking = (cfg.peekMode === 'chat' && cfg.useThinkingChat) || (cfg.peekMode === 'roast' && cfg.useThinkingRoast);
       var modelToUse = getActiveModel(useThinking);

       console.log("Peek Model:", modelToUse, "| Mode:", cfg.peekMode);

       try {
           // 构造 Payload
           var payload = {
               target_type: cfg.targetType,
               target_hwid: parseInt(cfg.targetHwid) || 0,
               mode: cfg.peekMode,
               prompt: (cfg.peekMode === 'chat') ? cfg.chatPrompt : cfg.roastPrompt,
               model: modelToUse
           };

           var analyzeUrl = live2d_settings.pythonServerUrl + 'see_and_roast';

           const response = await fetch(analyzeUrl, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(payload)
           });

           if (!response.ok) throw new Error('Python 后端连接异常');

           const data = await response.json();
           
           if (data.success === false) throw new Error(data.reply || "后端未知错误")

           live2d_settings.isLLMWriting = true;

           // 结果处理：聊天助手模式自动复制，吐槽模式直接显示
           if (cfg.peekMode === 'chat') {
               showMessage("回复已经复制到剪贴板啦！\n" + data.reply, 5000, true);
           } else {
               showMessage(data.reply, 6000, true);
           }

       } catch (error) {
           console.error("Peek Error:", error);
           live2d_settings.isLLMWriting = true;
           showMessage("我看不到屏幕了... 是不是 Python 脚本没运行？", 4000, true)
       } finally {
           // 解锁
           live2d_settings.isLLMThinking = false;
           live2d_settings.isLLMWriting = false;
       }
    }
    
    // ==========================================
}
