window.WAIFU_GLOBAL_DEFAULTS = {
    // --- 静态资源配置 ---
    staticAPIFile: 'live2d_api-master/model/static-api-file.json',
    staticPath: 'live2d_api-master/model/',
    defaultModel: '{"version":"1.0.0","model":"MODEL_HOME/Potion-Maker/Pio/model.moc","textures":["MODEL_HOME/Potion-Maker/Pio/textures/default-costume.png"],"layout":{"center_x":0.0,"center_y":-0.05,"width":2.0},"hit_areas_custom":{"head_x":[-0.35,0.6],"head_y":[0.19,-0.2],"body_x":[-0.3,-0.25],"body_y":[0.3,-0.9]},"motions":{"idle":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath7.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Breath8.mtn"}],"sleepy":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sleeping.mtn"}],"flick_head":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch Dere6.mtn"}],"tap_body":[{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Sukebei3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch1.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch2.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch3.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch4.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch5.mtn"},{"file":"MODEL_HOME/Potion-Maker/Pio/motions/Touch6.mtn"}]}}',

    // --- 后端接口 ---
    tipsMessage: 'waifu-tips.json',     // 同目录下可省略路径
    hitokotoAPI: 'hitokoto.cn',         // 一言 API，可选 'lwl12.com', 'hitokoto.cn', 'jinrishici.com'(古诗词), 'fghrsh.net'

    // --- 默认状态 ---
    modelId:            0,              // 默认模型 ID，可在 F12 控制台找到
    modelTexturesId:    61,             // 默认材质 ID，可在 F12 控制台找到
    nowModelID:         0,              
    nowTexturesID:      0,              

    // --- 工具栏开关 ---
    showToolMenu:       true,           // 显示 工具栏，可选 true(真), false(假)
    canCloseLive2d:     false,          // 显示 关闭看板娘  按钮
    canSwitchModel:     true,           // 显示 模型切换    按钮
    canSwitchTextures:  true,           // 显示 材质切换    按钮
    canSwitchHitokoto:  true,           // 显示 一言切换    按钮
    canTakeScreenshot:  false,          // 显示 看板娘截图  按钮
    canTurnToHomePage:  false,          // 显示 返回首页    按钮
    canTurnToAboutPage: false,          // 显示 跳转关于页  按钮
    showLLM:            true,           // 显示 LLM 对话    按钮
    showHistory:        true,           // 显示 历史记录    按钮
    showPeek:           true,           // 显示 Peek        按钮
    showSettings:       true,           // 显示 设置        按钮

    // --- 交互模式 ---
    modelStorage:           true,       // 记录 ID (刷新后恢复)，可选 true(真), false(假)
    modelRandMode:          'switch',   // 模型切换，可选 'rand'(随机), 'switch'(顺序)
    modelTexturesRandMode:  'rand',     // 材质切换，可选 'rand'(随机), 'switch'(顺序)

    // --- 提示消息选项 ---
    showHitokoto:       true,           // 显示一言
    showF12Status:      true,           // 显示加载状态
    showF12Message:     true,           // 显示看板娘消息
    showF12OpenMsg:     true,           // 显示控制台打开提示
    showCopyMessage:    true,           // 显示 复制内容 提示
    showWelcomeMessage: true,           // 显示进入面页欢迎词

    // --- 看板娘样式 ---
    waifuSize:              '280x250',  // 看板娘大小，例如 '280x250', '600x535'
    waifuTipsSize:          '250x75',   // 提示框大小，例如 '250x70', '570x150'
    waifuFontSize:          '12px',     // 提示框字体，例如 '12px', '30px'
    waifuToolFont:          '14px',     // 工具栏字体，例如 '14px', '36px'
    waifuToolLine:          '20px',     // 工具栏行高，例如 '20px', '36px'
    waifuToolTop:           '-20px',    // 工具栏顶部边距，例如 '0px', '-60px'
    waifuMinWidth:          'disable',  // 面页小于 指定宽度 隐藏看板娘，例如 'disable'(禁用), '768px'
    waifuEdgeSide:          'left:0',   // 看板娘贴边方向，例如 'left:0'(靠左 0px), 'right:30'(靠右 30px)
    waifuDraggable:         'disable',  // 拖拽样式，例如 'disable'(禁用), 'axis-x'(只能水平拖拽), 'unlimited'(自由拖拽)
    waifuDraggableRevert:   true,       // 松开鼠标还原拖拽位置，可选 true(真), false(假)

    // --- 杂项 ---
    l2dVersion:             '1.4.3',                                    // 当前版本
    l2dVerDate:             '2018.11.12',                               // 版本更新日期
    homePageUrl:            'auto',                                     // 主页地址，可选 'auto'(自动), '{URL 网址}'
    aboutPageUrl:           'https://www.fghrsh.net/post/123.html',     // 关于页地址, '{URL 网址}'
    screenshotCaptureName:  'live2d.png',                               // 看板娘截图文件名，例如 'live2d.png'

    // --- LLM & 后端设置 (原分散配置) ---
    llmApiUrl:          'http://127.0.0.1:11434/v1/chat/completions',   // API
    llmApiKey:          '',                                             // Key
    pythonServerUrl:    'http://127.0.0.1:11542/',                      // Python Server

    // --- 自动吐槽设置 ---
    autoRoast:      false,          // 是否开启自动定时截图吐槽 (true: 开启, false: 关闭)
    roastInterval:  60000,          // 自动吐槽间隔 (单位: 毫秒)，300000 = 5分钟

    // --- LLM 功能详细配置 ---
    modelNormal:        '',             // 普通对话模型
    modelThinking:      '',             // 思考/识屏模型
    useThinkingWaifu:   false,          // 闲聊是否使用思考模型
    useThinkingChat:    true,           // 聊天助手是否使用思考模型
    useThinkingRoast:   false,          // 吐槽是否使用思考模型
    waifuPrompt: '你是一个网页看板娘，请用简短、可爱的语气回答，不要超过50个字。',
    
    // Peek 设置
    targetType: 'fullscreen',
    targetHwid: 0,
    peekMode: 'roast',         // 'roast' or 'chat'
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
    memoryLimit: 10,

    // --- 运行时状态 (不建议保存到本地，但初始化需要) ---
    isLLMThinking: false,
    isLLMWriting: false
};