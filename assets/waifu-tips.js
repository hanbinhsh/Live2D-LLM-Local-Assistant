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
var currentTTSAudio = null;
var currentTTSObjectUrl = null;
var currentTTSRequestId = 0;
var currentTTSController = null;
var currentPCMPlayer = null;
var currentTTSDonePromise = Promise.resolve();
var currentMessageToken = 0;
var currentHideTimer = null;
var sharedPCMAudioContext = null;
var lastAudioPlaybackActivityAt = 0;
var AUDIO_IDLE_COLD_START_MS = 20000;

function trackCurrentTTSPromise(promise) {
    currentTTSDonePromise = Promise.resolve(promise).catch(function() {});
    return currentTTSDonePromise;
}

function getSharedPCMAudioContext() {
    var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
        throw new Error('当前浏览器不支持 AudioContext');
    }

    if (!sharedPCMAudioContext || sharedPCMAudioContext.state === 'closed') {
        sharedPCMAudioContext = new AudioContextCtor();
    }

    return sharedPCMAudioContext;
}

function getAudioIdleDurationMs() {
    if (!lastAudioPlaybackActivityAt) return Number.POSITIVE_INFINITY;
    return Date.now() - lastAudioPlaybackActivityAt;
}

function markAudioPlaybackActivity() {
    lastAudioPlaybackActivityAt = Date.now();
}

function stopCurrentTTSAudio() {
    if (currentTTSAudio) {
        try {
            currentTTSAudio.pause();
            currentTTSAudio.currentTime = 0;
        } catch (e) {}
        currentTTSAudio = null;
    }

    if (currentTTSObjectUrl) {
        URL.revokeObjectURL(currentTTSObjectUrl);
        currentTTSObjectUrl = null;
    }
}

function stopCurrentPCMPlayer() {
    if (currentPCMPlayer) {
        try {
            currentPCMPlayer.stop();
        } catch (e) {}
        currentPCMPlayer = null;
    }
}

function stopCurrentTTSFlow() {
    currentTTSRequestId += 1;
    trackCurrentTTSPromise(Promise.resolve());

    if (currentTTSController) {
        try {
            currentTTSController.abort();
        } catch (e) {}
        currentTTSController = null;
    }

    stopCurrentTTSAudio();
    stopCurrentPCMPlayer();
}

function stopLLMGeneration() {
    if (llmAbortController) {
        llmAbortController.abort(); // 1. 中止网络请求
        llmAbortController = null;
    }

    stopCurrentTTSFlow();
    
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

function getPythonServerBaseUrl() {
    var url = (live2d_settings.pythonServerUrl || 'http://127.0.0.1:11542/').trim();
    if (url.slice(-1) !== '/') url += '/';
    return url;
}

function cleanTextForTTS(text) {
    if (!text) return '';
    return String(text)
        .replace(/<[^>]*>/g, ' ')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildTTSSettingsPayload() {
    return {
        ttsApiUrl: live2d_settings.ttsApiUrl,
        ttsApiKey: live2d_settings.ttsApiKey,
        ttsGptModelPath: live2d_settings.ttsGptModelPath,
        ttsSovitsModelPath: live2d_settings.ttsSovitsModelPath,
        ttsRefAudioPath: live2d_settings.ttsRefAudioPath,
        ttsRefPromptText: live2d_settings.ttsRefPromptText,
        ttsRefPromptLang: live2d_settings.ttsRefPromptLang,
        ttsDefaultTextLang: live2d_settings.ttsDefaultTextLang,
        ttsTextSplitMethod: live2d_settings.ttsTextSplitMethod,
        ttsMediaType: live2d_settings.ttsMediaType,
        ttsTopK: live2d_settings.ttsTopK,
        ttsTopP: live2d_settings.ttsTopP,
        ttsTemperature: live2d_settings.ttsTemperature,
        ttsBatchSize: live2d_settings.ttsBatchSize,
        ttsBatchThreshold: live2d_settings.ttsBatchThreshold,
        ttsSplitBucket: live2d_settings.ttsSplitBucket,
        ttsSpeedFactor: live2d_settings.ttsSpeedFactor,
        ttsFragmentInterval: live2d_settings.ttsFragmentInterval,
        ttsSeed: live2d_settings.ttsSeed,
        ttsParallelInfer: live2d_settings.ttsParallelInfer,
        ttsRepetitionPenalty: live2d_settings.ttsRepetitionPenalty,
        ttsSampleSteps: live2d_settings.ttsSampleSteps,
        ttsSuperSampling: live2d_settings.ttsSuperSampling,
        ttsStreamingMode: live2d_settings.ttsStreamingMode,
        ttsOverlapLength: live2d_settings.ttsOverlapLength,
        ttsMinChunkLength: live2d_settings.ttsMinChunkLength
    };
}

function buildTTSRequestSettings(options) {
    var settings = buildTTSSettingsPayload();
    options = options || {};
    if (options.forceStreamingPlayback) {
        settings.ttsMediaType = 'raw';
        if (!settings.ttsStreamingMode || settings.ttsStreamingMode === 'false') {
            settings.ttsStreamingMode = '2';
        }
    }
    return settings;
}

function getTTSMinSentenceLength() {
    var value = parseInt(live2d_settings.ttsSentenceMinLength, 10);
    return isNaN(value) ? 8 : Math.max(1, value);
}

function getTTSMaxParallelRequests(useStreamingPlayback) {
    var value = parseInt(live2d_settings.ttsMaxParallelRequests, 10);
    if (isNaN(value) || value < 1) value = 2;
    return value;
}

function getTTSPrebufferChunks() {
    var value = parseInt(live2d_settings.ttsPrebufferChunks, 10);
    return isNaN(value) ? 3 : Math.max(1, value);
}

function getTTSPrebufferMs() {
    var value = parseInt(live2d_settings.ttsPrebufferMs, 10);
    return isNaN(value) ? 240 : Math.max(60, value);
}

function getPCMUsableBytes(byteLength) {
    if (!byteLength || byteLength < 2) return 0;
    return byteLength - (byteLength % 2);
}

function extractSpeakableSentence(textBuffer) {
    var majorPunctuationChars = ['。', '！', '？', '.', '!', '?', '\n'];
    var minorPunctuationChars = ['，', '、', ','];
    var minLength = getTTSMinSentenceLength();
    var majorMinLength = Math.max(2, Math.min(minLength, 4));
    var minorMinLength = Math.max(24, minLength * 4);
    var splitIdx = -1;

    for (var i = 0; i < textBuffer.length; i++) {
        if (i >= majorMinLength && majorPunctuationChars.indexOf(textBuffer[i]) !== -1) {
            splitIdx = i;
            while (splitIdx + 1 < textBuffer.length && majorPunctuationChars.indexOf(textBuffer[splitIdx + 1]) !== -1) {
                splitIdx += 1;
            }
            break;
        }
    }

    if (splitIdx === -1 && textBuffer.length >= minorMinLength) {
        for (var j = 0; j < textBuffer.length; j++) {
            if (j >= minorMinLength && minorPunctuationChars.indexOf(textBuffer[j]) !== -1) {
                splitIdx = j;
                while (splitIdx + 1 < textBuffer.length && minorPunctuationChars.indexOf(textBuffer[splitIdx + 1]) !== -1) {
                    splitIdx += 1;
                }
                break;
            }
        }
    }

    if (splitIdx === -1) return null;

    return {
        sentence: textBuffer.slice(0, splitIdx + 1).trim(),
        rest: textBuffer.slice(splitIdx + 1)
    };
}

function PCMStreamPlayer(options) {
    options = options || {};
    this.audioContext = getSharedPCMAudioContext();
    this.sampleRate = options.sampleRate || 32000;
    this.prebufferChunks = options.prebufferChunks || 3;
    this.prebufferMs = options.prebufferMs || 240;
    this.pendingChunks = [];
    this.pendingBytes = 0;
    this.sourceNodes = [];
    this.nextStartTime = 0;
    this.started = false;
    this.closed = false;
    this.initialLeadTime = options.initialLeadTime || 0.22;
    this.minScheduleLead = options.minScheduleLead || 0.015;
    this.prependSilenceMs = options.prependSilenceMs || 0;
    this.hasPrependedSilence = false;
    this.isColdStart = getAudioIdleDurationMs() >= AUDIO_IDLE_COLD_START_MS || this.audioContext.state === 'suspended';
    this.bytesPerSecond = this.sampleRate * 2;
    this.prebufferBytes = Math.max(2, Math.floor(this.bytesPerSecond * (this.prebufferMs / 1000)));

    if (this.isColdStart) {
        this.initialLeadTime = Math.max(this.initialLeadTime, 0.28);
        this.prependSilenceMs = Math.max(this.prependSilenceMs, 90);
        this.prebufferMs = Math.max(this.prebufferMs, 180);
        this.prebufferBytes = Math.max(2, Math.floor(this.bytesPerSecond * (this.prebufferMs / 1000)));
    }
}

PCMStreamPlayer.prototype.appendChunk = function(uint8Chunk) {
    if (this.closed || !uint8Chunk || !uint8Chunk.length) return;

    this.pendingChunks.push(uint8Chunk);
    this.pendingBytes += getPCMUsableBytes(uint8Chunk.byteLength);
    if (!this.started && this.pendingChunks.length >= this.prebufferChunks && this.pendingBytes >= this.prebufferBytes) {
        this.flushPending();
    } else if (this.started) {
        this.flushPending();
    }
};

PCMStreamPlayer.prototype.flushPending = function() {
    if (this.closed || !this.pendingChunks.length) return;

    if (!this.started) {
        this.started = true;
        this.nextStartTime = Math.max(this.audioContext.currentTime + this.initialLeadTime, this.nextStartTime);
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(function() {});
        }
        if (this.prependSilenceMs > 0 && !this.hasPrependedSilence) {
            this.scheduleSilence(this.prependSilenceMs);
            this.hasPrependedSilence = true;
        }
        markAudioPlaybackActivity();
    }

    while (this.pendingChunks.length) {
        this.scheduleChunk(this.pendingChunks.shift());
    }
};

PCMStreamPlayer.prototype.scheduleChunk = function(uint8Chunk) {
    var usableLength = getPCMUsableBytes(uint8Chunk.byteLength);
    if (usableLength <= 0) return;
    this.pendingBytes = Math.max(0, this.pendingBytes - usableLength);

    var pcm16 = new Int16Array(uint8Chunk.buffer, uint8Chunk.byteOffset, usableLength / 2);
    var float32 = new Float32Array(pcm16.length);
    for (var i = 0; i < pcm16.length; i++) {
        float32[i] = Math.max(-1, Math.min(1, pcm16[i] / 32768));
    }

    var audioBuffer = this.audioContext.createBuffer(1, float32.length, this.sampleRate);
    audioBuffer.copyToChannel(float32, 0);

    var source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    var startTime = Math.max(this.nextStartTime, this.audioContext.currentTime + this.minScheduleLead);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.sourceNodes.push(source);
    markAudioPlaybackActivity();
};

PCMStreamPlayer.prototype.scheduleSilence = function(durationMs) {
    if (!durationMs || durationMs <= 0) return;
    var frameCount = Math.max(1, Math.floor(this.sampleRate * (durationMs / 1000)));
    var audioBuffer = this.audioContext.createBuffer(1, frameCount, this.sampleRate);
    var source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    var startTime = Math.max(this.nextStartTime, this.audioContext.currentTime + this.minScheduleLead);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.sourceNodes.push(source);
    markAudioPlaybackActivity();
};

PCMStreamPlayer.prototype.finish = function() {
    this.flushPending();
};

PCMStreamPlayer.prototype.waitForDrain = function() {
    if (this.closed) return Promise.resolve();
    this.flushPending();
    var delay = Math.max(0, (this.nextStartTime - this.audioContext.currentTime) * 1000 + 80);
    return new Promise(function(resolve) {
        window.setTimeout(resolve, delay);
    });
};

PCMStreamPlayer.prototype.stop = function() {
    if (this.closed) return;
    this.closed = true;

    this.sourceNodes.forEach(function(source) {
        try { source.stop(); } catch (e) {}
        try { source.disconnect(); } catch (e) {}
    });
    this.sourceNodes = [];
    this.pendingChunks = [];
    markAudioPlaybackActivity();
};

async function requestTTSAudioBlob(text, signal) {
    var cleanedText = cleanTextForTTS(text);
    if (!cleanedText) return null;

    const response = await fetch(getPythonServerBaseUrl() + 'tts/speak', {
        method: 'POST',
        signal: signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: cleanedText,
            provider: live2d_settings.ttsService,
            settings: buildTTSRequestSettings()
        })
    });

    if (!response.ok) {
        let errorText = 'TTS 请求失败';
        try {
            const errorData = await response.json();
            errorText = errorData.detail || errorData.error || errorText;
        } catch (e) {}
        throw new Error(errorText);
    }

    const blob = await response.blob();
    if (!blob || !blob.size) {
        throw new Error('TTS 服务没有返回音频数据');
    }
    return blob;
}

function playTTSAudioBlob(blob, requestId, signal) {
    return new Promise(function(resolve, reject) {
        if (!blob) return resolve();
        if (requestId !== currentTTSRequestId) return resolve();
        if (signal && signal.aborted) return resolve();

        stopCurrentTTSAudio();

        currentTTSObjectUrl = URL.createObjectURL(blob);
        currentTTSAudio = new Audio(currentTTSObjectUrl);

        var cleanup = function() {
            if (signal) signal.removeEventListener('abort', onAbort);
        };
        var finish = function() {
            cleanup();
            stopCurrentTTSAudio();
            resolve();
        };
        var fail = function(error) {
            cleanup();
            stopCurrentTTSAudio();
            reject(error);
        };
        var onAbort = function() {
            finish();
        };

        currentTTSAudio.onended = finish;
        currentTTSAudio.onplay = function() {
            markAudioPlaybackActivity();
        };
        currentTTSAudio.onerror = function() {
            fail(new Error('音频播放失败'));
        };

        if (signal) signal.addEventListener('abort', onAbort, { once: true });

        currentTTSAudio.play().catch(fail);
    });
}

async function streamTTSAudio(text, signal, requestId) {
    var cleanedText = cleanTextForTTS(text);
    if (!cleanedText) return;

    stopCurrentPCMPlayer();

    const response = await fetch(getPythonServerBaseUrl() + 'tts/stream', {
        method: 'POST',
        signal: signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: cleanedText,
            provider: live2d_settings.ttsService,
            settings: buildTTSRequestSettings({ forceStreamingPlayback: true })
        })
    });

    if (!response.ok) {
        let errorText = 'TTS 流式请求失败';
        try {
            const errorData = await response.json();
            errorText = errorData.detail || errorData.error || errorText;
        } catch (e) {}
        throw new Error(errorText);
    }

    if (!response.body) {
        throw new Error('浏览器不支持流式音频读取');
    }

    var reader = response.body.getReader();
    var player = new PCMStreamPlayer({
        sampleRate: 32000,
        prebufferChunks: getTTSPrebufferChunks(),
        prebufferMs: getTTSPrebufferMs()
    });
    currentPCMPlayer = player;

    try {
        while (true) {
            if (signal && signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            const result = await reader.read();
            if (result.done) break;
            if (requestId !== currentTTSRequestId) break;
            player.appendChunk(result.value);
        }

        player.finish();
        await player.waitForDrain();
    } finally {
        try { reader.cancel(); } catch (e) {}
        if (currentPCMPlayer === player) currentPCMPlayer = null;
        player.stop();
    }
}

function createSentenceTTSPipeline() {
    var useStreamingPlayback = !!live2d_settings.ttsUseStreamingPlayback;
    var controller = new AbortController();
    var queue = [];
    var sentenceJobs = {};
    var nextEnqueueIndex = 0;
    var nextPlayIndex = 0;
    var activeCount = 0;
    var finalized = false;
    var finished = false;
    var maxParallel = getTTSMaxParallelRequests(useStreamingPlayback);
    var playerPromise;
    var requestId = ++currentTTSRequestId;
    var resolveDone;
    var rejectDone;
    var donePromise = new Promise(function(resolve, reject) {
        resolveDone = resolve;
        rejectDone = reject;
    });

    currentTTSController = controller;
    stopCurrentTTSAudio();
    stopCurrentPCMPlayer();

    function sleep(ms) {
        return new Promise(function(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    function shouldUseStreamingSentencePlayback(job) {
        if (!useStreamingPlayback) return false;

        var safeStreamingLength = Math.max(24, getTTSMinSentenceLength() * 3);
        if (job.index === 0) return true;
        if (job.text.length < safeStreamingLength) return false;
        return true;
    }

    function getSentenceStreamConfig(job) {
        var prebufferChunks = getTTSPrebufferChunks();
        var prebufferMs = getTTSPrebufferMs();
        var initialLeadTime = 0.22;
        var minScheduleLead = 0.015;
        var minorPauseMatches = job.text.match(/[、，,]/g);
        var minorPauseCount = minorPauseMatches ? minorPauseMatches.length : 0;
        var hasMinorPause = minorPauseCount > 0;
        var hasEllipsis = /(\.\.\.|…+)/.test(job.text);
        var isShortSentence = job.text.length <= Math.max(18, getTTSMinSentenceLength() * 2);
        var prependSilenceMs = 0;

        if (job.index === 0) {
            prebufferChunks = Math.min(prebufferChunks, 2);
            prebufferMs = Math.min(prebufferMs, 160);
            initialLeadTime = 0.18;
            minScheduleLead = 0.012;
            prependSilenceMs = 45;
        }

        if (hasMinorPause && isShortSentence) {
            prebufferChunks = Math.max(prebufferChunks, 3);
            prebufferMs = Math.max(prebufferMs, 280);
            initialLeadTime = Math.max(initialLeadTime, 0.2);
        } else if (isShortSentence) {
            prebufferChunks = Math.max(prebufferChunks, 2);
            prebufferMs = Math.max(prebufferMs, 220);
        }

        if (minorPauseCount >= 2 || hasEllipsis) {
            prebufferChunks = Math.max(prebufferChunks, 4);
            prebufferMs = Math.max(prebufferMs, 300);
            initialLeadTime = Math.max(initialLeadTime, 0.2);
        } else if (hasMinorPause) {
            prebufferChunks = Math.max(prebufferChunks, 3);
            prebufferMs = Math.max(prebufferMs, 180);
        }

        return {
            prebufferChunks: prebufferChunks,
            prebufferMs: prebufferMs,
            initialLeadTime: initialLeadTime,
            minScheduleLead: minScheduleLead,
            prependSilenceMs: prependSilenceMs
        };
    }

    function maybeResolve() {
        if (finished) return;
        if (!finalized) return;
        if (activeCount !== 0) return;
        if (queue.length !== 0) return;
        if (Object.keys(sentenceJobs).length !== 0) return;
        if (nextPlayIndex !== nextEnqueueIndex) return;

        finished = true;
        Promise.resolve(playerPromise).then(function() {
            resolveDone();
        }).catch(rejectDone);
    }

    async function fetchStreamingSentence(job) {
        const response = await fetch(getPythonServerBaseUrl() + 'tts/stream', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: job.text,
                provider: live2d_settings.ttsService,
                settings: buildTTSRequestSettings({ forceStreamingPlayback: true })
            })
        });

        if (!response.ok) {
            let errorText = 'TTS 流式请求失败';
            try {
                const errorData = await response.json();
                errorText = errorData.detail || errorData.error || errorText;
            } catch (e) {}
            throw new Error(errorText);
        }

        if (!response.body) {
            throw new Error('浏览器不支持流式音频读取');
        }

        var reader = response.body.getReader();
        try {
            while (true) {
                if (controller.signal.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
                }

                const result = await reader.read();
                if (result.done) break;
                if (requestId !== currentTTSRequestId) break;

                if (result.value && result.value.length) {
                    job.chunks.push(result.value);
                    job.bufferedBytes += getPCMUsableBytes(result.value.byteLength);
                }
            }
        } finally {
            try { reader.cancel(); } catch (e) {}
            job.done = true;
        }
    }

    async function playStreamingSentence(job) {
        var streamConfig = getSentenceStreamConfig(job);
        console.log('[TTS Stream Config]', {
            index: job.index,
            text: job.text,
            isColdStart: getAudioIdleDurationMs() >= AUDIO_IDLE_COLD_START_MS,
            prebufferChunks: streamConfig.prebufferChunks,
            prebufferMs: streamConfig.prebufferMs,
            initialLeadTime: streamConfig.initialLeadTime,
            minScheduleLead: streamConfig.minScheduleLead,
            prependSilenceMs: streamConfig.prependSilenceMs
        });
        var player = new PCMStreamPlayer({
            sampleRate: 32000,
            prebufferChunks: streamConfig.prebufferChunks,
            prebufferMs: streamConfig.prebufferMs,
            initialLeadTime: streamConfig.initialLeadTime,
            minScheduleLead: streamConfig.minScheduleLead,
            prependSilenceMs: streamConfig.prependSilenceMs
        });
        currentPCMPlayer = player;
        try {
            while (true) {
                if (controller.signal.aborted) return;

                if (!job.startedPlayback) {
                    var requiredChunks = streamConfig.prebufferChunks;
                    var requiredBytes = Math.max(2, Math.floor((32000 * 2) * (streamConfig.prebufferMs / 1000)));
                    if (!job.done && (job.chunks.length < requiredChunks || job.bufferedBytes < requiredBytes)) {
                        await sleep(8);
                        continue;
                    }
                    job.startedPlayback = true;
                }

                while (job.chunks.length) {
                    var nextChunk = job.chunks.shift();
                    job.bufferedBytes = Math.max(0, job.bufferedBytes - getPCMUsableBytes(nextChunk.byteLength));
                    player.appendChunk(nextChunk);
                }

                if (job.done) {
                    break;
                }

                await sleep(8);
            }

            player.finish();
            await player.waitForDrain();
        } finally {
            if (currentPCMPlayer === player) currentPCMPlayer = null;
            player.stop();
        }
    }

    async function consumeSentencePlayback() {
        try {
            while (true) {
                if (controller.signal.aborted) return;

                var job = sentenceJobs[nextPlayIndex];
                if (!job) {
                    if (finalized && nextPlayIndex >= nextEnqueueIndex && activeCount === 0 && queue.length === 0) {
                        break;
                    }
                    await sleep(8);
                    continue;
                }

                if (job.playbackMode === 'stream') {
                    await playStreamingSentence(job);
                } else {
                    while (!controller.signal.aborted && !job.blob && !job.done) {
                        await sleep(8);
                    }
                    if (controller.signal.aborted) return;
                    if (job.blob) {
                        await playTTSAudioBlob(job.blob, requestId, controller.signal);
                    }
                }

                delete sentenceJobs[nextPlayIndex];
                nextPlayIndex += 1;
                maybeResolve();
            }
        } catch (error) {
            if (error && error.name !== 'AbortError') {
                throw error;
            }
        }
    }

    async function runJob(job) {
        try {
            if (job.playbackMode === 'stream') {
                await fetchStreamingSentence(job);
            } else {
                job.blob = await requestTTSAudioBlob(job.text, controller.signal);
                job.done = true;
            }
        } catch (error) {
            if (error && error.name !== 'AbortError') {
                console.error('[TTS Pipeline] 句子合成失败:', error);
            }
            job.done = true;
        } finally {
            activeCount -= 1;
            pump();
            maybeResolve();
        }
    }

    function pump() {
        while (!controller.signal.aborted && activeCount < maxParallel && queue.length > 0) {
            var job = queue.shift();
            activeCount += 1;
            runJob(job);
        }
    }

    playerPromise = consumeSentencePlayback();

    return {
        enqueue: function(text) {
            var cleanedText = cleanTextForTTS(text);
            if (!cleanedText || controller.signal.aborted) return;
            var job = {
                index: nextEnqueueIndex,
                text: cleanedText,
                playbackMode: 'buffered',
                chunks: [],
                done: false,
                startedPlayback: false,
                bufferedBytes: 0,
                blob: null
            };
            job.playbackMode = shouldUseStreamingSentencePlayback(job) ? 'stream' : 'buffered';
            sentenceJobs[nextEnqueueIndex] = job;
            queue.push(job);
            nextEnqueueIndex += 1;
            pump();
        },
        finish: function() {
            finalized = true;
            maybeResolve();
        },
        waitUntilDone: function() {
            return donePromise;
        },
        abort: function() {
            if (finished) return;
            controller.abort();
            finished = true;
            stopCurrentTTSAudio();
            stopCurrentPCMPlayer();
            resolveDone();
        }
    };
}

async function speakMessageWithTTS(text) {
    if (!live2d_settings.ttsEnabled) return;
    if (!live2d_settings.ttsService) return;

    var cleanedText = cleanTextForTTS(text);
    if (!cleanedText) return;

    stopCurrentTTSFlow();

    var controller = new AbortController();
    var requestId = ++currentTTSRequestId;
    currentTTSController = controller;

    var playbackPromise = (async function() {
        if (live2d_settings.ttsUseStreamingPlayback) {
            await streamTTSAudio(cleanedText, controller.signal, requestId);
        } else {
            var blob = await requestTTSAudioBlob(cleanedText, controller.signal);
            await playTTSAudioBlob(blob, requestId, controller.signal);
        }
    })();
    trackCurrentTTSPromise(playbackPromise);

    try {
        await playbackPromise;
    } catch (error) {
        if (error && error.name !== 'AbortError') {
            console.error('[TTS] 播放失败:', error);
        }
    } finally {
        if (currentTTSController === controller) {
            currentTTSController = null;
        }
    }
}

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
        loadModel(newModelID, 0, { forceBuiltin: true });
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'switchModel'){
        let newModelID = modelID+1;
        if(newModelID >= staticAPI.model_list.models.length){
            newModelID = 0;
        }
        loadModel(newModelID, 0, { forceBuiltin: true });
        showMessage(staticAPI.model_list.messages[newModelID], 3000, true);
    } else if (action === 'randTextures' || action === 'switchTextures'){
        if (window.__waifuCurrentModelSource === 'custom') {
            showMessage("当前模型还没有可切换皮肤哦", 3000, true);
            return;
        }
        
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
        loadModel(modelID, newTextureID, { forceBuiltin: true });
    }
}

window.__waifuCurrentModelSource = 'builtin';

function shouldPreferCustomModel(options) {
    options = options || {};
    if (options.forceBuiltin) return false;
    return !!(
        live2d_settings.customModelEnabled &&
        live2d_settings.customModelAutoLoad &&
        typeof live2d_settings.customModelFolder === 'string' &&
        live2d_settings.customModelFolder.trim()
    );
}

async function registerCustomModelFolder(folderPath) {
    var response = await fetch(getPythonServerBaseUrl() + 'live2d/custom_model/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath })
    });

    var result = null;
    try {
        result = await response.json();
    } catch (e) {}

    if (!response.ok) {
        throw new Error(result && (result.detail || result.error) ? (result.detail || result.error) : '自定义模型注册失败');
    }
    return result;
}

function activateLegacyBridge() {
    if (window.Live2DModelBridge && typeof window.Live2DModelBridge.useLegacy === 'function' && typeof window.Live2DManager !== 'undefined') {
        window.Live2DModelBridge.useLegacy(window.Live2DManager);
        if (window.Live2DCubism4 && typeof window.Live2DCubism4.exportDebugInfo === 'function') {
            setTimeout(function() {
                window.Live2DCubism4.exportDebugInfo();
            }, 500);
        }
    }
}

function loadBuiltinModel(modelId, modelTexturesId) {
    window.__waifuCurrentModelSource = 'builtin';
    if (window.Live2DCubism4 && typeof window.Live2DCubism4.destroy === 'function') {
        window.Live2DCubism4.destroy();
    }
    loadlive2d('live2d', localAPI('get', modelId, modelTexturesId), 
        (live2d_settings.showF12Status ? console.log('[Status]','live2d','模型',modelId+'-'+modelTexturesId,'加载完成'):null));
    setTimeout(activateLegacyBridge, 500);
}

async function loadExternalCustomModel(folderPath) {
    var registration = await registerCustomModelFolder(folderPath);
    if (!registration || !registration.manifest_url) {
        throw new Error('自定义模型返回了空配置');
    }

    if (registration.type === 'cubism4') {
        if (!window.Live2DCubism4 || typeof window.Live2DCubism4.load !== 'function') {
            throw new Error('Cubism4 前端运行时未准备好');
        }
        await window.Live2DCubism4.load(registration.manifest_url, registration.descriptor || {});
        window.__waifuCurrentModelSource = 'custom';
        return registration;
    }

    if (window.Live2DCubism4 && typeof window.Live2DCubism4.destroy === 'function') {
        window.Live2DCubism4.destroy();
    }
    loadlive2d('live2d', registration.manifest_url, 
        (live2d_settings.showF12Status ? console.log('[Status]','live2d','自定义模型加载完成'):null));
    window.__waifuCurrentModelSource = 'custom';
    setTimeout(activateLegacyBridge, 500);
    return registration;
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
        currentMessageToken += 1;
        var messageToken = currentMessageToken;
        
        if(flag) sessionStorage.setItem('waifu-text', text);
        
        if (currentHideTimer) {
            window.clearTimeout(currentHideTimer);
            currentHideTimer = null;
        }

        $('.waifu-tips').stop();
        $('.waifu-tips').html(text).fadeTo(200, 1);
        // 如果 timeout 是 0，表示不自动隐藏（思考中状态）
        if (timeout === 0) {
            // 仅仅停止当前动画，不调用 hideMessage
            $('.waifu-tips').stop().css('opacity', 1);
        } else {
            if (timeout === undefined) timeout = 5000;
            hideMessage(timeout, messageToken);
        }
        return messageToken;
    }
}

function hideMessage(timeout, messageToken) {
    $('.waifu-tips').stop().css('opacity',1);
    if (timeout === undefined) timeout = 5000;
    if (currentHideTimer) {
        window.clearTimeout(currentHideTimer);
        currentHideTimer = null;
    }
    currentHideTimer = window.setTimeout(function() {
        if (messageToken !== undefined && messageToken !== currentMessageToken) return;
        sessionStorage.removeItem('waifu-text');
        $('.waifu-tips').stop().fadeTo(200, 0);
        currentHideTimer = null;
    }, timeout);
}

function keepMessageVisibleUntilTTS(messageToken, fallbackTimeout) {
    if (messageToken === undefined) return;
    if (!live2d_settings.ttsEnabled || !live2d_settings.ttsService) {
        hideMessage(fallbackTimeout || 5000, messageToken);
        return;
    }

    currentTTSDonePromise.finally(function() {
        hideMessage(300, messageToken);
    });
}

function expandLive2DSelector(selector) {
    if (!selector || typeof selector !== 'string') return selector;
    if (selector.indexOf('#live2d') === -1) return selector;
    if (selector.indexOf('#live2d-cubism4') !== -1) return selector;
    return selector.replace(/#live2d/g, '#live2d, #live2d-cubism4');
}

function initModel(waifuPath, type) {
    // ==========================================
    //       全局设置面板绑定逻辑
    // ==========================================
    $(document).ready(function() {
        $(document).on('click', '.waifu-tool .fui-gear', function() {
            openSettingsCenter({ tab: 'general' });
        });

        window.addEventListener('storage', function(e) {
            if (e.key === 'waifu_global_settings') {
                console.log('检测到设置变更，正在同步...');
                // 重新读取配置
                try {
                    var saved = localStorage.getItem('waifu_global_settings');
                    if (saved) {
                        var nextSettings = JSON.parse(saved);
                        var shouldReloadModel =
                            nextSettings.customModelEnabled !== live2d_settings.customModelEnabled ||
                            nextSettings.customModelAutoLoad !== live2d_settings.customModelAutoLoad ||
                            nextSettings.customModelFolder !== live2d_settings.customModelFolder;

                        $.extend(live2d_settings, nextSettings);

                        if (shouldReloadModel) {
                            loadModel(
                                live2d_settings.nowModelID || live2d_settings.modelId || 0,
                                live2d_settings.nowTexturesID || live2d_settings.modelTexturesId || 0
                            );
                        }
                    }
                    
                    if (typeof applyImmediateChanges === 'function') {
                        for(var k in live2d_settings) {
                            applyImmediateChanges(k, live2d_settings[k]);
                        }
                    }
                } catch(err) {}
            }
        });
    });

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
        if (key === 'showReport') toggleBtn($('.waifu-tool .fui-calendar-solid'), val); 
        if (key === 'showSettings') toggleBtn($('.waifu-tool .fui-gear'), val); 
        
        // 样式微调
        if (key === 'waifuDraggable') {
            if ($(".waifu").hasClass("ui-draggable")) {
                if (val === 'disable') $(".waifu").draggable('disable');
                else $(".waifu").draggable('enable');
            }
        }
        if (key === 'waifuTipsBackgroundColor') {
            $('.waifu-tips').css('background-color', val || window.WAIFU_GLOBAL_DEFAULTS.waifuTipsBackgroundColor);
        }
        if (key === 'waifuTipsTextColor') {
            $('.waifu-tips').css('color', val || window.WAIFU_GLOBAL_DEFAULTS.waifuTipsTextColor);
        }
    }

    function buildSettingsCenterUrl(options) {
        options = options || {};
        var params = new URLSearchParams();
        if (options.tab) params.set('tab', options.tab);
        if (options.action) params.set('action', options.action);
        if (options.reportCategory) params.set('reportCategory', options.reportCategory);
        var query = params.toString();
        return 'settings.html' + (query ? '?' + query : '');
    }

    function isDesktopWidgetContext() {
        var ua = navigator.userAgent || '';
        return /QtWebEngine/i.test(ua) || /QtWebKit/i.test(ua);
    }

    async function openWidgetSettingsWindow() {
        var baseUrl = (live2d_settings.pythonServerUrl || '').trim();
        if (!baseUrl) {
            showMessage('未配置 Python 后端地址，无法打开桌面设置窗口', 3000, true);
            return false;
        }
        try {
            var response = await fetch(baseUrl.replace(/\/?$/, '/') + 'widget/open_settings', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return true;
        } catch (err) {
            console.error('[Settings] open widget settings failed:', err);
            showMessage('桌面设置窗口打开失败，请确认后端和桌面挂件正在运行', 3500, true);
            return false;
        }
    }

    function openSettingsCenter(options) {
        var url = buildSettingsCenterUrl(options);
        if (isDesktopWidgetContext()) {
            openWidgetSettingsWindow();
            return;
        }
        var win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) {
            try {
                win.opener = null;
                win.focus();
            } catch (err) {}
            return;
        }
        if (typeof showMessage === 'function') {
            showMessage('请允许弹出新窗口后再打开设置页', 3000, true);
        }
    }

    // 点击报告按钮
    $(document).on('click', '.waifu-tool .fui-calendar-solid', function() {
        openSettingsCenter({
            tab: 'report',
            action: 'generate',
            reportCategory: live2d_settings.reportCategory || 'activity'
        });
    });

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
    $(".waifu-tips").css("background-color", live2d_settings.waifuTipsBackgroundColor || window.WAIFU_GLOBAL_DEFAULTS.waifuTipsBackgroundColor);
    $(".waifu-tips").css("color", live2d_settings.waifuTipsTextColor || window.WAIFU_GLOBAL_DEFAULTS.waifuTipsTextColor);
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
        window.WaifuShared.fetchModelList();
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

    setTimeout(function() {
        if (live2d_settings.pythonServerUrl && ($('#model-normal').length || $('#peek-window-list').length)) {
            window.WaifuShared.fetchModelList();
            $('#btn-refresh-windows').click(); 
        }
    }, 100);

    function getModelForPurpose(purpose) {
        if (purpose === 'waifu') {
            return live2d_settings.modelWaifu ||
                   live2d_settings.modelNormal ||
                   live2d_settings.modelThinking ||
                   live2d_settings.modelChat ||
                   live2d_settings.modelRoast;
        }
        if (purpose === 'chat') {
            return live2d_settings.modelChat ||
                   live2d_settings.modelWaifu ||
                   live2d_settings.modelThinking ||
                   live2d_settings.modelNormal ||
                   live2d_settings.modelRoast;
        }
        if (purpose === 'roast') {
            return live2d_settings.modelRoast ||
                   live2d_settings.modelChat ||
                   live2d_settings.modelThinking ||
                   live2d_settings.modelNormal ||
                   live2d_settings.modelWaifu;
        }
        if (purpose === 'report') {
            return live2d_settings.modelReport ||
                   live2d_settings.modelWaifu ||
                   live2d_settings.modelChat ||
                   live2d_settings.modelRoast ||
                   live2d_settings.modelNormal ||
                   live2d_settings.modelThinking;
        }
        return live2d_settings.modelWaifu ||
               live2d_settings.modelChat ||
               live2d_settings.modelRoast ||
               live2d_settings.modelReport ||
               live2d_settings.modelNormal ||
               live2d_settings.modelThinking;
    }

    async function fetchLLMReplyStandard(messages, modelToUse, signal) {
        const response = await fetch(live2d_settings.llmApiUrl, {
            method: 'POST',
            signal: signal,
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
            return data.choices[0].message.content || '';
        }
        return '';
    }

    async function fetchLLMReplySentenceStream(messages, modelToUse, signal) {
        const response = await fetch(live2d_settings.llmApiUrl, {
            method: 'POST',
            signal: signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + live2d_settings.llmApiKey },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) throw new Error('API Error: ' + response.status);
        if (!response.body) throw new Error('当前接口不支持流式返回');

        var reader = response.body.getReader();
        var decoder = new TextDecoder('utf-8');
        var pending = '';
        var fullText = '';
        var sentenceBuffer = '';
        var pipeline = createSentenceTTSPipeline();

        function handleEventBlock(blockText) {
            var lines = blockText.split(/\r?\n/);
            lines.forEach(function(line) {
                if (!line || line.indexOf('data:') !== 0) return;

                var raw = line.slice(5).trim();
                if (!raw) return;
                if (raw === '[DONE]') return;

                try {
                    var payload = JSON.parse(raw);
                    var delta = '';
                    if (payload.choices && payload.choices[0]) {
                        delta = (payload.choices[0].delta && payload.choices[0].delta.content) ||
                                (payload.choices[0].message && payload.choices[0].message.content) ||
                                '';
                    } else if (payload.message && payload.message.content) {
                        delta = payload.message.content;
                    } else if (payload.response) {
                        delta = payload.response;
                    }

                    if (!delta) return;

                    fullText += delta;
                    sentenceBuffer += delta;

                    live2d_settings.isLLMWriting = true;
                    showMessage(fullText, 0, true);
                    live2d_settings.isLLMWriting = false;

                    while (true) {
                        var splitResult = extractSpeakableSentence(sentenceBuffer);
                        if (!splitResult) break;
                        if (splitResult.sentence) pipeline.enqueue(splitResult.sentence);
                        sentenceBuffer = splitResult.rest;
                    }
                } catch (e) {
                    console.warn('[LLM Stream] 无法解析数据块:', raw);
                }
            });
        }

        try {
            while (true) {
                const result = await reader.read();
                if (result.done) break;

                pending += decoder.decode(result.value, { stream: true });
                var blocks = pending.split('\n\n');
                pending = blocks.pop();

                blocks.forEach(handleEventBlock);
            }

            pending += decoder.decode();
            if (pending.trim()) handleEventBlock(pending);

            if (sentenceBuffer.trim()) {
                pipeline.enqueue(sentenceBuffer.trim());
            }
            pipeline.finish();
            var pipelineDonePromise = pipeline.waitUntilDone();
            trackCurrentTTSPromise(pipelineDonePromise);
            pipelineDonePromise.catch(function(error) {
                console.error('[TTS Pipeline] 后台播放失败:', error);
            });
            return fullText;
        } catch (error) {
            pipeline.abort();
            throw error;
        } finally {
            try { reader.cancel(); } catch (e) {}
        }
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

        var modelToUse = getModelForPurpose('waifu');

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

            var reply = '';
            var ttsPlaybackPromise = Promise.resolve();
            if (live2d_settings.ttsEnabled && live2d_settings.ttsPipelineMode === 'sentence_stream') {
                reply = await fetchLLMReplySentenceStream(messages, modelToUse, llmAbortController.signal);
                ttsPlaybackPromise = currentTTSDonePromise;
            } else {
                reply = await fetchLLMReplyStandard(messages, modelToUse, llmAbortController.signal);
                if (reply) {
                    ttsPlaybackPromise = speakMessageWithTTS(reply);
                }
            }

            if (reply) {
                live2d_settings.isLLMWriting = true;
                var replyMessageToken = showMessage(reply, live2d_settings.ttsEnabled ? 0 : 6000, true);
                if (live2d_settings.ttsEnabled) {
                    trackCurrentTTSPromise(ttsPlaybackPromise);
                    keepMessageVisibleUntilTTS(replyMessageToken, 6000);
                }
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
                live2d_settings.isLLMWriting = false;
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

        var modelToUse = getModelForPurpose(live2d_settings.peekMode === 'chat' ? 'chat' : 'roast');

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
                var roastMessageToken = showMessage(data.reply, live2d_settings.ttsEnabled ? 0 : 6000, true);
                var roastPlaybackPromise = speakMessageWithTTS(data.reply);
                if (live2d_settings.ttsEnabled) {
                    trackCurrentTTSPromise(roastPlaybackPromise);
                    keepMessageVisibleUntilTTS(roastMessageToken, 6000);
                }
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
            if (!window.Live2DModelBridge || !window.Live2DModelBridge.getModel(0)) {
                return;
            }

            try {
                if (window.Live2DCubism4 && typeof window.Live2DCubism4.exportDebugInfo === 'function') {
                    window.Live2DCubism4.exportDebugInfo();
                }
                clearInterval(exportTimer);
                setInterval(checkModelChange, 2000);
                
            } catch (e) {
                console.error("[Bridge] 数据提取失败:", e);
            }
        }, 1000);

        var currentModelRef = null;
        function checkModelChange() {
            if (!window.Live2DModelBridge) return;
            var model = window.Live2DModelBridge.getModel(0);
            if (model !== currentModelRef) {
                currentModelRef = model;
                if (window.Live2DCubism4 && typeof window.Live2DCubism4.exportDebugInfo === 'function') {
                    window.Live2DCubism4.exportDebugInfo();
                }
            }
        }

        window.addEventListener('storage', function(e) {
            if (e.key === 'waifu_debug_command' && e.newValue) {
                var cmd = JSON.parse(e.newValue);
                executeDebugCommand(cmd);
            }
        });
    })();

    // --- 通用执行函数 (核心修改：支持指定 Index) ---
    window.executeDebugCommand = function(cmd) {
        if (!window.Live2DModelBridge || typeof window.Live2DModelBridge.executeDebugCommand !== 'function') {
            return;
        }
        console.log("[Bridge] 执行指令:", cmd.type);
        window.Live2DModelBridge.executeDebugCommand(cmd);
    };
}

async function loadModel(modelId, modelTexturesId=0, options) {
    options = options || {};
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

    if (shouldPreferCustomModel(options)) {
        try {
            var registration = await loadExternalCustomModel(live2d_settings.customModelFolder.trim());
            if (registration && registration.descriptor && registration.descriptor.display_name) {
                showMessage("已加载外部模型: " + registration.descriptor.display_name, 2500, true);
            }
            return;
        } catch (error) {
            console.error('[CustomModel] load failed:', error);
            showMessage("外部模型加载失败，先切回内置模型啦", 3000, true);
        }
    }

    loadBuiltinModel(modelId, modelTexturesId);
}

function loadTipsMessage(result) {
    window.waifu_tips = result;
    
    $.each(result.mouseover, function (index, tips){
        $(document).on("mouseover", expandLive2DSelector(tips.selector), function (){
            var text = getRandText(tips.text);
            text = text.render({text: $(this).text()});
            showMessage(text, 3000);
        });
    });
    $.each(result.click, function (index, tips){
        $(document).on("click", expandLive2DSelector(tips.selector), function (){
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
        if (window.__waifuCurrentModelSource === 'custom') {
            var customCanvas = document.getElementById('live2d-cubism4');
            if (customCanvas) {
                var link = document.createElement('a');
                link.setAttribute('type', 'hidden');
                link.href = customCanvas.toDataURL('image/png');
                link.download = live2d_settings.screenshotCaptureName || 'live2d.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }
        }
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
        showMessage(text, 6000);
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
