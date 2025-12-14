/* waifu-tips.js - 整合版 */

// 1. 定义默认配置 (作为兜底)
var default_live2d_settings = {
    // 后端接口
    tipsMessage: 'waifu-tips.json',
    hitokotoAPI: 'hitokoto.cn',
    
    // 默认模型
    modelId: 0,
    modelTexturesId: 61,
    
    // 工具栏
    showToolMenu: true,
    canCloseLive2d: false,
    canSwitchModel: true,
    canSwitchTextures: true,
    canSwitchHitokoto: true,
    canTakeScreenshot: false,
    canTurnToHomePage: false,
    canTurnToAboutPage: false,
    showLLM: true,
    showPeek: true,
    showSettings: true,
    
    // 切换模式
    modelStorage: true,
    modelRandMode: 'switch',
    modelTexturesRandMode: 'rand',
    
    // 消息选项
    showHitokoto: true,
    showF12Status: true,
    showF12Message: true,
    showF12OpenMsg: true,
    showCopyMessage: true,
    showWelcomeMessage: true,
    
    // 样式设置
    waifuSize: '280x250',
    waifuTipsSize: '250x75',
    waifuFontSize: '12px',
    waifuToolFont: '14px',
    waifuToolLine: '20px',
    waifuToolTop: '-20px',
    waifuMinWidth: 'disable',
    waifuEdgeSide: 'left:0',
    waifuDraggable: 'disable',
    waifuDraggableRevert: true,
    
    // 杂项
    l2dVersion: '1.4.3',
    l2dVerDate: '2018.11.12',
    homePageUrl: 'auto',
    aboutPageUrl: 'https://www.fghrsh.net/post/123.html',
    screenshotCaptureName: 'live2d.png',
    
    // 运行时状态 (不保存到 storage)
    nowModelID: 0,
    nowTexturesID: 0,
    isLLMThinking: false,
    isLLMWriting: false,

    // LLM 设置
    llmApiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    llmApiKey: '',
    pythonServerUrl: 'http://127.0.0.1:11542/',
    
    autoRoast: false,
    roastInterval: 60000
};

// 2. 初始化 live2d_settings
window.live2d_settings = Array();

// 从 LocalStorage 加载用户修改过的配置 (Global)
function loadGlobalSettings() {
    var saved = localStorage.getItem('waifu_global_config');
    if (saved) {
        var userConfig = JSON.parse(saved);
        // 合并配置：默认 < 用户配置
        $.extend(default_live2d_settings, userConfig);
    }
    // 将最终配置挂载到 window.live2d_settings
    for (var key in default_live2d_settings) {
        live2d_settings[key] = default_live2d_settings[key];
    }
}
loadGlobalSettings();

// 静态 API 文件路径 (一般不改)
live2d_settings['staticAPIFile'] = 'live2d_api-master/model/static-api-file.json';
live2d_settings['staticPath'] = 'live2d_api-master/model/';
live2d_settings['defaultModel'] = '{"version":"1.0.0","model":"MODEL_HOME/Potion-Maker/Pio/model.moc","textures":["MODEL_HOME/Potion-Maker/Pio/textures/default-costume.png"],"layout":{"center_x":0.0,"center_y":-0.05,"width":2.0},"hit_areas_custom":{"head_x":[-0.35,0.6],"head_y":[0.19,-0.2],"body_x":[-0.3,-0.25],"body_y":[0.3,-0.9]},"motions":{"idle":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath7.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath8.mtn"}],"sleepy":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sleeping.mtn"}],"flick_head":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere6.mtn"}],"tap_body":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch6.mtn"}]}}'.replace(/MODEL_HOME/g, live2d_settings['staticPath']);


/****************************************************************************************************/

// 保存全局配置到 LocalStorage
function saveGlobalSettings() {
    var toSave = {};
    // 遍历 HTML 中的 config-item 类，保存它们的值
    $('.config-item').each(function() {
        var key = $(this).data('key');
        var val;
        if ($(this).attr('type') === 'checkbox') {
            val = $(this).is(':checked');
        } else {
            val = $(this).val();
            // 尝试转换数字
            if (!isNaN(parseFloat(val)) && isFinite(val) && $(this).attr('type') === 'number') {
                val = parseFloat(val);
            }
        }
        toSave[key] = val;
        // 实时更新当前运行环境
        live2d_settings[key] = val;
    });
    localStorage.setItem('waifu_global_config', JSON.stringify(toSave));
}

// Load static api configurations
var staticAPI;
var staticAPILoaded = false;

$.getJSON(live2d_settings.staticAPIFile, function(result){
    staticAPI = result;
    staticAPILoaded = true;
    console.log('[Status] Static API loaded successfully');
}).fail(function(error) {
    console.error('[Error] Failed to load static API:', error);
});

function localAPI(action, modelID, texturesID=0){
    if(action === 'get'){
        live2d_settings.nowModelID = modelID;
        live2d_settings.nowTexturesID = texturesID;
        if(staticAPI === undefined){
            let blob = new Blob([live2d_settings.defaultModel], { type: 'Application/json' })
            return URL.createObjectURL( blob );
        } else {
            if(typeof staticAPI.model_list.models[modelID] === 'string'){
                let json_pat = staticAPI.json_pattern[staticAPI.model_list.models[modelID]];
                json_pat = json_pat.replace(/\"TEXTURES_REP\"/g, JSON.stringify(staticAPI.Textures[modelID][texturesID]));
                json_pat = json_pat.replace(/MODEL_HOME/g, live2d_settings['staticPath']);
                let blob = new Blob([json_pat], { type: 'Application/json' })
                return URL.createObjectURL( blob );
            } else {
                let model_name = staticAPI.model_list.models[modelID][texturesID];
                let json_pat = staticAPI.json_pattern[model_name];
                json_pat = json_pat.replace(/\"TEXTURES_REP\"/g, JSON.stringify(staticAPI.Textures[modelID][texturesID]));
                json_pat = json_pat.replace(/MODEL_HOME/g, live2d_settings['staticPath']);
                let blob = new Blob([json_pat], { type: 'Application/json' })
                return URL.createObjectURL( blob );
            }
        }
    } else if (action === 'randModel'){
        let newModelID = Math.floor(Math.random()*(staticAPI.model_list.models.length));
        while(newModelID === modelID && newModelID !== 0){ newModelID = Math.floor(Math.random()*(staticAPI.model_list.models.length)); }
        loadModel(newModelID, 0);
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'switchModel'){
        let newModelID = modelID+1;
        if(newModelID >= staticAPI.model_list.models.length){ newModelID = 0; }
        loadModel(newModelID, 0);
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'randTextures'){
        let totalTexturesNum;
        if(typeof staticAPI.model_list.models[modelID] === 'string') totalTexturesNum = staticAPI.Textures[modelID].length;
        else totalTexturesNum = staticAPI.model_list.models[modelID].length;
        let newTextureID = Math.floor(Math.random()*totalTexturesNum);
        while(newTextureID === texturesID){ newTextureID = Math.floor(Math.random()*totalTexturesNum); }
        loadModel(modelID, newTextureID);
    } else if (action === 'switchTextures'){
        let totalTexturesNum;
        if(typeof staticAPI.model_list.models[modelID] === 'string') totalTexturesNum = staticAPI.Textures[modelID].length;
        else totalTexturesNum = staticAPI.model_list.models[modelID].length;
        let newTextureID = texturesID + 1;
        if(newTextureID >= totalTexturesNum && newTextureID !== 0){ newTextureID = 0; }
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

function empty(obj) {return typeof obj=="undefined"||obj==null||obj==""?true:false}
function getRandText(text) {return Array.isArray(text) ? text[Math.floor(Math.random() * text.length + 1)-1] : text}

function showMessage(text, timeout, flag) {
    // 拦截逻辑
    if (live2d_settings.showLLM && live2d_settings.isLLMThinking && !live2d_settings.isLLMWriting) {
        console.log('[Message Blocked]', text);
        return; 
    }

    if(flag || sessionStorage.getItem('waifu-text') === '' || sessionStorage.getItem('waifu-text') === null){
        if(Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1)-1];
        if (live2d_settings.showF12Message) console.log('[Message]', text.replace(/<[^<>]+>/g,''));
        
        if(flag) sessionStorage.setItem('waifu-text', text);
        
        $('.waifu-tips').stop();
        $('.waifu-tips').html(text).fadeTo(200, 1);
        
        if (timeout === 0) {
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
    if (!staticAPILoaded) {
        setTimeout(function() { initModel(waifuPath, type); }, 100);
        return;
    }
    
    // Console Banner (省略)
    console.log("Live2D Loaded");

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
    
    // 根据配置隐藏工具栏按钮
    if (!live2d_settings.showToolMenu) $('.waifu-tool').hide();
    if (!live2d_settings.canCloseLive2d) $('.waifu-tool .fui-cross').hide();
    if (!live2d_settings.canSwitchModel) $('.waifu-tool .fui-eye').hide();
    if (!live2d_settings.canSwitchTextures) $('.waifu-tool .fui-user').hide();
    if (!live2d_settings.canSwitchHitokoto) $('.waifu-tool .fui-chat').hide();
    if (!live2d_settings.canTakeScreenshot) $('.waifu-tool .fui-photo').hide();
    if (!live2d_settings.canTurnToHomePage) $('.waifu-tool .fui-home').hide();
    if (!live2d_settings.canTurnToAboutPage) $('.waifu-tool .fui-info-circle').hide();
    
    // 初始化 LLM 按钮
    if (live2d_settings.showLLM) {
        if ($('.waifu-tool .fui-star').length === 0) $('.waifu-tool').append('<span class="fui-star"></span>');
    } else {
        $('.waifu-tool .fui-star').hide();
    }
    // 初始化 Peek 按钮
    if (live2d_settings.showPeek) {
         if ($('.waifu-tool .fui-video').length === 0) $('.waifu-tool').append('<span class="fui-video"></span>');
    } else {
        $('.waifu-tool .fui-video').hide();
    }
    // 初始化 设置 按钮
    if (live2d_settings.showSettings) {
         if ($('.waifu-tool .fui-gear').length === 0) $('.waifu-tool').append('<span class="fui-gear"></span>');
    } else {
        $('.waifu-tool .fui-gear').hide();
    }

    // 加载模型
    var modelId = live2d_settings.modelId;
    var modelTexturesId = live2d_settings.modelTexturesId;
    if (live2d_settings.modelStorage) {
        modelId = localStorage.getItem('modelId') || modelId;
        modelTexturesId = localStorage.getItem('modelTexturesId') || modelTexturesId;
    }
    loadModel(parseInt(modelId), parseInt(modelTexturesId));
}

function loadModel(modelId, modelTexturesId=0) {
    if (live2d_settings.modelStorage) {
        localStorage.setItem('modelId', modelId);
        localStorage.setItem('modelTexturesId', modelTexturesId);
    }
    loadlive2d('live2d', localAPI('get', modelId, modelTexturesId), null);
}

function loadTipsMessage(result) {
    window.waifu_tips = result;
    
    // 基础事件绑定 (省略)
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
    // ... seasons, welcome message 等 ... 
    if (live2d_settings.showWelcomeMessage) window.showWelcomeMessage(result);

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

    $('.waifu-tool .fui-eye').click(function (){ localAPI(live2d_settings.modelRandMode+'Model', live2d_settings.nowModelID); });
    $('.waifu-tool .fui-user').click(function (){ localAPI(live2d_settings.modelTexturesRandMode+'Textures', live2d_settings.nowModelID, live2d_settings.nowTexturesID); });
    $('.waifu-tool .fui-chat').click(function (){ showHitokoto(); });

    // 一言逻辑
    if (live2d_settings.showHitokoto) {
        window.getActed = false; window.hitokotoTimer = 0; window.hitokotoInterval = false;
        $(document).mousemove(function(e){getActed = true;}).keydown(function(){getActed = true;});
        setInterval(function(){ if (!getActed) ifActed(); else elseActed(); }, 1000);
    }
    function ifActed() { if (!hitokotoInterval) { hitokotoInterval = true; hitokotoTimer = window.setInterval(showHitokotoActed, 30000); } }
    function elseActed() { getActed = hitokotoInterval = false; window.clearInterval(hitokotoTimer); }
    function showHitokotoActed() { if ($(document)[0].visibilityState == 'visible') showHitokoto(); }
    function showHitokoto() {
        // ... (原有一言代码) ...
        $.getJSON('https://v1.hitokoto.cn',function(result){
            if (!empty(result.from)) showMessage(result.hitokoto, 7000, true);
        });
    }

    // ==========================================
    //    核心逻辑：设置面板与LLM整合
    // ==========================================
    
    // 1. 初始化设置面板 UI 值
    function initSettingsUI() {
        // 填充 global settings (.config-item)
        $('.config-item').each(function() {
            var key = $(this).data('key');
            var val = live2d_settings[key];
            if ($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', val);
            } else {
                $(this).val(val);
            }
        });

        // 填充 Peek settings (LLM Tab specific)
        var peekCfg = loadPeekSettings();
        $('#model-normal').val(peekCfg.modelNormal);
        $('#model-thinking').val(peekCfg.modelThinking);
        $('#use-thinking-waifu').prop('checked', peekCfg.useThinkingWaifu);
        $('#use-thinking-chat').prop('checked', peekCfg.useThinkingChat);
        $('#use-thinking-roast').prop('checked', peekCfg.useThinkingRoast);
        $('#peek-mode').val(peekCfg.peekMode);
        $('#peek-target-type').val(peekCfg.targetType);
        if (!$('#prompt-roast').val()) $('#prompt-roast').val(peekCfg.roastPrompt);
        if (!$('#prompt-chat').val()) $('#prompt-chat').val(peekCfg.chatPrompt);
        
        toggleUI();
        fetchModelList(); // 获取模型列表
    }
    
    // 延迟初始化以免 DOM 未就绪
    setTimeout(initSettingsUI, 500);

    // 2. 绑定 Global Settings 变更事件
    $('.config-item').change(function() {
        saveGlobalSettings();
        // 部分设置实时生效
        if($(this).data('key') === 'showLLM') {
             live2d_settings.showLLM ? $('.waifu-tool .fui-star').show() : $('.waifu-tool .fui-star').hide();
        }
        if($(this).data('key') === 'showPeek') {
             live2d_settings.showPeek ? $('.waifu-tool .fui-video').show() : $('.waifu-tool .fui-video').hide();
        }
    });

    // 3. Tab 切换逻辑
    $('.settings-tab-item').click(function() {
        var tabId = $(this).data('tab');
        $('.settings-tab-item').removeClass('active');
        $(this).addClass('active');
        $('.tab-pane').hide();
        $('#tab-' + tabId).show(); // fadeIn handled by CSS
    });

    // 4. 打开/关闭面板
    $('.waifu-tool .fui-gear').click(function() { $('.waifu-settings-panel').addClass('open'); });
    $('.settings-close').click(function() { 
        $('.waifu-settings-panel').removeClass('open'); 
        savePeekSettings(); // 关闭时保存 Peek
        saveGlobalSettings(); // 关闭时保存 Global
    });

    // --- LLM & Peek 配置逻辑 ---
    var defaultPeekSettings = {
        modelNormal: '', modelThinking: '',
        useThinkingWaifu: false, useThinkingChat: true, useThinkingRoast: false,
        targetType: 'fullscreen', targetHwid: 0, peekMode: 'roast',
        roastPrompt: "你是一个住在用户电脑桌面上的可爱看板娘。这是用户当前的屏幕截图。\n用户当前正在操作的窗口是：'/window_title'。\n背景里挂着的窗口还有：/window_list。\n\n请根据屏幕内容和窗口判断用户正在做什么，并以**女朋友或贴心助手**的口吻直接对用户说话（使用第二人称‘你’）。\n要求：\n1. 不要描述画面内容，直接开启话题。\n2. 这是一个猜测互动的过程。\n3. 语气要软萌、可爱、充满元气。\n4. 字数控制在50字以内。",
        chatPrompt: "你是一个智能聊天助手。当前窗口是 '/window_title'。\n请阅读图片中的聊天记录或文本内容，结合上下文，为我草拟一个合适的、高情商的回复。\n只输出回复内容，不要包含解释。"
    };
    function loadPeekSettings() {
        var saved = localStorage.getItem('waifu_llm_settings');
        if (saved) return $.extend({}, defaultPeekSettings, JSON.parse(saved));
        return defaultPeekSettings;
    }
    function savePeekSettings() {
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
            chatPrompt: $('#prompt-chat').val()
        };
        localStorage.setItem('waifu_llm_settings', JSON.stringify(current));
        return current;
    }
    var cfg = loadPeekSettings();

    // 监听 LLM 设置变更
    $('#tab-llm input, #tab-llm select, #tab-llm textarea').change(function() {
        toggleUI();
        savePeekSettings();
    });

    function toggleUI() {
        var mode = $('#peek-mode').val();
        var target = $('#peek-target-type').val();
        $('.prompt-group').hide();
        $('#group-prompt-' + mode).show();
        if (target === 'window') $('#group-window-select').show(); else $('#group-window-select').hide();
    }

    // 模型列表刷新
    $('#btn-refresh-models').click(function() {
        $(this).text('...');
        fetchModelList($(this));
    });
    
    async function fetchModelList(btn) {
        try {
            var url = live2d_settings.pythonServerUrl.replace(/\/$/, "") + '/list_models';
            const response = await fetch(url);
            const data = await response.json();
            var optionsHtml = '';
            if (data.models && data.models.length > 0) {
                data.models.forEach(m => { optionsHtml += `<option value="${m}">${m}</option>`; });
            } else { optionsHtml = '<option value="">未找到模型</option>'; }
            $('#model-normal, #model-thinking').html(optionsHtml);
            
            // 恢复选择
            var curr = loadPeekSettings();
            if (curr.modelNormal) $('#model-normal').val(curr.modelNormal);
            if (curr.modelThinking) $('#model-thinking').val(curr.modelThinking);
        } catch (e) { console.error(e); }
        if(btn) btn.text('刷新列表');
    }

    // 窗口列表刷新
    $('#btn-refresh-windows').click(async function() {
        var btn = $(this); btn.text('...');
        try {
            var url = live2d_settings.pythonServerUrl.replace(/\/$/, "") + '/list_windows';
            const response = await fetch(url);
            const data = await response.json();
            var select = $('#peek-window-list'); select.empty();
            if (data.windows && data.windows.length > 0) {
                data.windows.forEach(win => { select.append(`<option value="${win.id}">${win.title}</option>`); });
            } else { select.append('<option value="0">未找到窗口</option>'); }
        } catch (e) { showMessage('连接失败', 3000, true); }
        btn.text('刷新');
    });

    // 辅助: 获取当前模型
    function getActiveModel(isThinkingMode) {
        var s = savePeekSettings();
        var m = isThinkingMode ? s.modelThinking : s.modelNormal;
        return m || s.modelNormal || 'gpt-3.5-turbo';
    }

    // --- 功能实现: Chat & Peek ---
    
    // Waifu Chat
    $('.waifu-tool .fui-star').click(function() {
        $('.waifu-chat-box').slideToggle(200, function() { if ($(this).is(':visible')) $('#waifu-input').focus(); });
    });
    $('#waifu-send-btn').click(sendToLLM);
    $('#waifu-input').keydown(function(e) { if (e.keyCode === 13) sendToLLM(); });

    async function sendToLLM() {
        var input = $('#waifu-input'); var text = input.val();
        if (!text || text.trim() === '') return;
        input.val(''); $('.waifu-chat-box').slideUp(200);

        live2d_settings.isLLMThinking = true; live2d_settings.isLLMWriting = true;
        showMessage("正在思考中... ( •̀ ω •́ )y", 0, true);
        live2d_settings.isLLMWriting = false;

        var useThinking = $('#use-thinking-waifu').is(':checked');
        var modelToUse = getActiveModel(useThinking);

        try {
            const response = await fetch(live2d_settings.llmApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + live2d_settings.llmApiKey },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: [
                        {"role": "system", "content": "你是一个网页看板娘，请用简短、可爱的语气回答，不要超过50个字。"},
                        {"role": "user", "content": text}
                    ],
                    temperature: 0.7, stream: false
                })
            });
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                live2d_settings.isLLMWriting = true;
                showMessage(data.choices[0].message.content, 6000, true);
            }
        } catch (error) {
            console.error(error); live2d_settings.isLLMWriting = true;
            showMessage("连接失败...", 4000, true);
        } finally {
            live2d_settings.isLLMThinking = false; live2d_settings.isLLMWriting = false;
        }
    }

    // Peek
    $('.waifu-tool .fui-video').off('click').on('click', function() { doPeekAction(); });
    // 自动吐槽定时器
    if (live2d_settings.autoRoast) {
        setInterval(function() { 
            if (live2d_settings.autoRoast && !live2d_settings.isLLMThinking) doPeekAction(); 
        }, live2d_settings.roastInterval);
    }

    async function doPeekAction() {
        if (live2d_settings.isLLMThinking) return;
        var cfg = savePeekSettings();
        
        live2d_settings.isLLMThinking = true; live2d_settings.isLLMWriting = true;
        if (cfg.peekMode === 'chat') showMessage("正在分析并生成回复...", 0, true);
        else showMessage("让我看看你在干什么... (盯)", 0, true);
        live2d_settings.isLLMWriting = false;

        var useThinking = (cfg.peekMode === 'chat' && cfg.useThinkingChat) || (cfg.peekMode === 'roast' && cfg.useThinkingRoast);
        var modelToUse = getActiveModel(useThinking);

        try {
            var url = live2d_settings.pythonServerUrl.replace(/\/$/, "") + '/see_and_roast';
            var payload = {
                target_type: cfg.targetType, target_hwid: parseInt(cfg.targetHwid) || 0,
                mode: cfg.peekMode, prompt: (cfg.peekMode === 'chat') ? cfg.chatPrompt : cfg.roastPrompt,
                model: modelToUse
            };
            const response = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const data = await response.json();
            
            live2d_settings.isLLMWriting = true;
            if (cfg.peekMode === 'chat') showMessage("回复已生成 (系统自动复制)！\n\n" + data.reply, 7000, true);
            else showMessage(data.reply, 6000, true);
        } catch (error) {
            console.error(error); live2d_settings.isLLMWriting = true;
            showMessage("Peek 失败: " + error.message, 4000, true);
        } finally {
            live2d_settings.isLLMThinking = false; live2d_settings.isLLMWriting = false;
        }
    }
}