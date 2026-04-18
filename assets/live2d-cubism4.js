(function(window, document) {
    "use strict";

    var customCanvasId = "live2d-cubism4";
    var legacyCanvasId = "live2d";
    var currentApp = null;
    var currentModel = null;
    var currentAdapter = null;
    var currentDescriptor = null;
    var ambientMotionIntervalId = null;
    var sleepyTimerId = null;
    var sleepyTimeoutMs = 50000;

    var MOTION_PRIORITY_IDLE = 1;
    var MOTION_PRIORITY_SLEEPY = 2;
    var MOTION_PRIORITY_NORMAL = 3;

    function getLegacyCanvas() {
        return document.getElementById(legacyCanvasId);
    }

    function getCustomCanvas() {
        return document.getElementById(customCanvasId);
    }

    function parseWaifuSize() {
        var fallback = { width: 280, height: 250 };
        var raw = window.live2d_settings && window.live2d_settings.waifuSize;
        if (!raw || typeof raw !== "string") return fallback;
        var matched = raw.match(/(\d+)\s*x\s*(\d+)/i);
        if (!matched) return fallback;
        return {
            width: parseInt(matched[1], 10) || fallback.width,
            height: parseInt(matched[2], 10) || fallback.height
        };
    }

    function syncCanvasSize() {
        var canvas = getCustomCanvas();
        if (!canvas) return;
        var size = parseWaifuSize();
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.style.width = size.width + "px";
        canvas.style.height = size.height + "px";
    }

    function showCustomCanvas() {
        var legacyCanvas = getLegacyCanvas();
        var customCanvas = getCustomCanvas();
        if (legacyCanvas) legacyCanvas.style.display = "none";
        if (customCanvas) customCanvas.style.display = "block";
    }

    function showLegacyCanvas() {
        var legacyCanvas = getLegacyCanvas();
        var customCanvas = getCustomCanvas();
        if (legacyCanvas) legacyCanvas.style.display = "block";
        if (customCanvas) customCanvas.style.display = "none";
    }

    function emitMessage(text, timeout) {
        if (typeof window.showMessage === "function") {
            window.showMessage(text, timeout || 3000, true);
        } else {
            console.log("[Cubism4]", text);
        }
    }

    function getSessionStorage() {
        try {
            return window.sessionStorage;
        } catch (error) {
            return null;
        }
    }

    function setSleepyState(isSleepy) {
        var storage = getSessionStorage();
        if (!storage) return;
        storage.setItem("Sleepy", isSleepy ? "1" : "0");
    }

    function isSleepyState() {
        var storage = getSessionStorage();
        return !!storage && storage.getItem("Sleepy") === "1";
    }

    function clearSleepyTimer() {
        var storage = getSessionStorage();
        if (sleepyTimerId) {
            window.clearTimeout(sleepyTimerId);
            sleepyTimerId = null;
        }
        if (storage) {
            var storageTimerId = storage.getItem("SleepyTimer");
            if (storageTimerId) {
                window.clearTimeout(Number(storageTimerId));
                storage.removeItem("SleepyTimer");
            }
        }
    }

    function scheduleSleepyTimer() {
        var storage = getSessionStorage();
        clearSleepyTimer();
        sleepyTimerId = window.setTimeout(function() {
            sleepyTimerId = null;
            setSleepyState(true);
            triggerAmbientMotion(true);
        }, sleepyTimeoutMs);
        if (storage) {
            storage.setItem("SleepyTimer", String(sleepyTimerId));
        }
    }

    function markInteractionActivity() {
        var wasSleepy = isSleepyState();
        setSleepyState(false);
        if (wasSleepy) {
            triggerAmbientMotion(false);
        }
        scheduleSleepyTimer();
    }

    function normalizeMotionGroupKey(groupName) {
        return String(groupName || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "");
    }

    function normalizeHitAreaName(areaName) {
        var normalized = String(areaName || "").toLowerCase();
        normalized = normalized.replace(/^hitarea[_-]?/i, "");
        return normalized;
    }

    function normalizeMotionMap(motions) {
        var result = {};
        if (!motions || typeof motions !== "object") return result;
        Object.keys(motions).forEach(function(groupName) {
            var files = motions[groupName];
            if (!Array.isArray(files)) return;
            result[groupName] = files.map(function(file) {
                return { file: file };
            });
        });
        return result;
    }

    function createExpressionMap(expressions) {
        var result = {};
        if (!Array.isArray(expressions)) return result;
        expressions.forEach(function(name) {
            result[name] = { name: name };
        });
        return result;
    }

    function buildMotionIndex(motionMap) {
        var exact = {};
        var normalized = {};
        Object.keys(motionMap).forEach(function(groupName) {
            exact[groupName] = groupName;
            normalized[normalizeMotionGroupKey(groupName)] = groupName;
        });
        return {
            exact: exact,
            normalized: normalized
        };
    }

    function resolveMotionGroupAlias(indexMap, requestedGroup) {
        var exact = indexMap.exact;
        var normalized = indexMap.normalized;
        if (exact[requestedGroup]) {
            return exact[requestedGroup];
        }

        var aliasCandidates = {
            idle: ["idle", "idlemotion", "default"],
            sleepy: ["sleepy", "sleep", "sleepmotion", "idle"],
            tap_body: ["tapbody", "tap", "touchbody", "touch", "bodytouch", "bodytap"],
            flick_head: ["flickhead", "flick", "touchhead", "headtouch", "headtap", "taphead", "touch", "tap"]
        };
        var normalizedRequested = normalizeMotionGroupKey(requestedGroup);
        var candidates = aliasCandidates[normalizedRequested] || [normalizedRequested];

        for (var i = 0; i < candidates.length; i++) {
            if (normalized[candidates[i]]) {
                return normalized[candidates[i]];
            }
        }

        return null;
    }

    function resolveTapZoneFromPoint(x, y) {
        if (!currentModel) return null;

        if (typeof currentModel.hitTest === "function") {
            var hitAreas = [];
            try {
                hitAreas = currentModel.hitTest(x, y) || [];
            } catch (error) {
                console.warn("[Cubism4] hitTest failed:", error);
            }

            for (var i = 0; i < hitAreas.length; i++) {
                var normalizedName = normalizeHitAreaName(hitAreas[i]);
                if (normalizedName.indexOf("head") !== -1) return "head";
                if (normalizedName.indexOf("body") !== -1) return "body";
            }
        }

        if (typeof currentModel.getBounds !== "function") return null;
        var bounds = currentModel.getBounds();
        if (!bounds || typeof bounds.contains !== "function" || !bounds.contains(x, y)) {
            return null;
        }

        var relativeY = (y - bounds.y) / Math.max(bounds.height || 1, 1);
        return relativeY <= 0.42 ? "head" : "body";
    }

    function createCustomAdapter(model, descriptor) {
        var motionMap = normalizeMotionMap(descriptor && descriptor.motions);
        var expressionNames = descriptor && Array.isArray(descriptor.expressions) ? descriptor.expressions : [];
        var motionIndex = buildMotionIndex(motionMap);
        return {
            _pixiModel: model,
            _descriptor: descriptor || {},
            expressions: createExpressionMap(expressionNames),
            modelSetting: {
                json: {
                    motions: motionMap
                }
            },
            setExpression: function(name) {
                return model.expression(name);
            },
            setRandomExpression: function() {
                if (!expressionNames.length) return Promise.resolve(false);
                return model.expression();
            },
            resolveMotionGroup: function(groupName) {
                return resolveMotionGroupAlias(motionIndex, groupName);
            },
            startMotion: function(groupName, index, priority) {
                var resolvedGroup = this.resolveMotionGroup(groupName);
                if (!resolvedGroup || !motionMap[resolvedGroup] || !motionMap[resolvedGroup][index]) {
                    return Promise.resolve(false);
                }
                return model.motion(resolvedGroup, index, priority);
            },
            startRandomMotion: function(groupName, priority) {
                var resolvedGroup = this.resolveMotionGroup(groupName);
                if (!resolvedGroup || !motionMap[resolvedGroup] || !motionMap[resolvedGroup].length) {
                    return Promise.resolve(false);
                }
                return model.motion(resolvedGroup, undefined, priority);
            }
        };
    }

    function exportDebugInfo() {
        var bridge = window.Live2DModelBridge;
        if (!bridge) return;
        var model = bridge.getModel(0);
        if (!model || !model.modelSetting || !model.modelSetting.json) return;

        var expressions = model.expressions ? Object.keys(model.expressions) : [];
        var motionDetail = {};
        var rawMotions = model.modelSetting.json.motions || {};

        Object.keys(rawMotions).forEach(function(groupName) {
            var fileList = rawMotions[groupName];
            if (!Array.isArray(fileList)) return;
            motionDetail[groupName] = fileList.map(function(item) {
                if (typeof item === "string") return item;
                return item.file || item.File || "";
            }).filter(Boolean);
        });

        localStorage.setItem("waifu_debug_info", JSON.stringify({
            expressions: expressions,
            motions: motionDetail,
            modelId: window.live2d_settings ? window.live2d_settings.modelId || 0 : 0,
            timestamp: Date.now()
        }));
    }

    function createBridge() {
        if (window.Live2DModelBridge) return window.Live2DModelBridge;

        window.Live2DModelBridge = {
            _provider: null,
            _source: "none",
            useLegacy: function(manager) {
                this._provider = {
                    type: "cubism2",
                    getModel: function(index) {
                        if (index !== 0) return null;
                        return manager && typeof manager.getModel === "function" ? manager.getModel(0) : null;
                    },
                    supportsRawMotion: true
                };
                this._source = "cubism2";
                exportDebugInfo();
            },
            useCustom: function(adapter, sourceType) {
                this._provider = {
                    type: sourceType || "cubism4",
                    getModel: function(index) {
                        return index === 0 ? adapter : null;
                    },
                    supportsRawMotion: false
                };
                this._source = sourceType || "cubism4";
                exportDebugInfo();
            },
            clear: function() {
                this._provider = null;
                this._source = "none";
                localStorage.removeItem("waifu_debug_info");
            },
            getModel: function(index) {
                if (!this._provider || typeof this._provider.getModel !== "function") return null;
                return this._provider.getModel(index);
            },
            getSource: function() {
                return this._source;
            },
            executeDebugCommand: function(cmd) {
                var model = this.getModel(0);
                if (!model) return;

                if (cmd.type === "expression") {
                    if (typeof model.setExpression === "function") {
                        model.setExpression(cmd.name);
                        emitMessage("调试表情: " + cmd.name, 1000);
                    }
                    return;
                }

                if (cmd.type === "motion") {
                    var motionResult;
                    if (cmd.index !== undefined && typeof model.startMotion === "function") {
                        motionResult = model.startMotion(cmd.name, cmd.index, 3);
                        if (motionResult !== false) emitMessage("调试动作: " + cmd.filename, 1000);
                    } else if (typeof model.startRandomMotion === "function") {
                        motionResult = model.startRandomMotion(cmd.name, 3);
                    }
                    Promise.resolve(motionResult).then(function(success) {
                        if (success === false) emitMessage("这个动作组现在还不能播放哦", 2000);
                    }).catch(function(error) {
                        console.error("[Bridge] Motion failed:", error);
                        emitMessage("动作播放失败了", 2000);
                    });
                    return;
                }

                if (cmd.type === "raw_motion") {
                    if (!model.mainMotionManager || typeof window.Live2DMotion === "undefined") {
                        emitMessage("当前模型不支持 Raw Motion 调试", 2500);
                        return;
                    }
                    try {
                        var rawData = cmd.data;
                        var buf = new ArrayBuffer(rawData.length);
                        var bufView = new Uint8Array(buf);
                        for (var i = 0; i < rawData.length; i++) {
                            bufView[i] = rawData.charCodeAt(i);
                        }
                        var motion = window.Live2DMotion.loadMotion(buf);
                        model.mainMotionManager.startMotionPrio(motion, 3);
                        emitMessage("正在执行自定义动作...", 1000);
                    } catch (error) {
                        console.error("[Bridge] Raw Motion failed:", error);
                        alert("动作数据解析失败，请检查格式。\n" + error.message);
                    }
                }
            }
        };

        return window.Live2DModelBridge;
    }

    function ensureDependencies() {
        if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
            throw new Error("Cubism4 运行时尚未加载完成");
        }
    }

    function isMotionPlaybackFinished() {
        if (!currentModel || !currentModel.internalModel || !currentModel.internalModel.motionManager) {
            return true;
        }
        var manager = currentModel.internalModel.motionManager;
        if (typeof manager.isFinished !== "function") return true;
        try {
            return manager.isFinished();
        } catch (error) {
            console.warn("[Cubism4] motionManager.isFinished failed:", error);
            return true;
        }
    }

    function triggerAmbientMotion(forceSleepy) {
        if (!currentAdapter) return Promise.resolve(false);
        if (!isMotionPlaybackFinished()) return Promise.resolve(false);

        var motionName = forceSleepy || isSleepyState() ? "sleepy" : "idle";
        var priority = forceSleepy || isSleepyState() ? MOTION_PRIORITY_SLEEPY : MOTION_PRIORITY_IDLE;
        return Promise.resolve(currentAdapter.startRandomMotion(motionName, priority)).catch(function(error) {
            console.warn("[Cubism4] ambient motion failed:", error);
            return false;
        });
    }

    function startAmbientMotionLoop() {
        if (ambientMotionIntervalId) {
            window.clearInterval(ambientMotionIntervalId);
        }
        ambientMotionIntervalId = window.setInterval(function() {
            triggerAmbientMotion(false);
        }, 1200);
    }

    function stopAmbientMotionLoop() {
        if (ambientMotionIntervalId) {
            window.clearInterval(ambientMotionIntervalId);
            ambientMotionIntervalId = null;
        }
    }

    function fitModelToCanvas() {
        if (!currentApp || !currentModel) return;
        var canvas = getCustomCanvas();
        if (!canvas) return;

        currentApp.renderer.resize(canvas.width, canvas.height);

        var bounds = currentModel.getLocalBounds();
        var sourceWidth = bounds && bounds.width ? bounds.width : currentModel.width || canvas.width;
        var sourceHeight = bounds && bounds.height ? bounds.height : currentModel.height || canvas.height;
        if (!sourceWidth || !sourceHeight) return;

        var scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight) * 0.92;
        currentModel.scale.set(scale);

        var offsetX = bounds ? bounds.x : 0;
        var offsetY = bounds ? bounds.y : 0;
        var offsetWidth = bounds ? bounds.width : sourceWidth;
        var offsetHeight = bounds ? bounds.height : sourceHeight;

        currentModel.x = canvas.width / 2 - (offsetX + offsetWidth / 2) * scale;
        currentModel.y = canvas.height - (offsetY + offsetHeight) * scale;
    }

    function handleDocumentMouseMove(event) {
        if (!currentModel) return;
        var canvas = getCustomCanvas();
        if (!canvas || canvas.style.display === "none") return;
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
        markInteractionActivity();
        currentModel.focus(x, y);
    }

    function handleCanvasTap(x, y) {
        if (!currentModel) return;

        markInteractionActivity();
        currentModel.tap(x, y);

        var tapZone = resolveTapZoneFromPoint(x, y);
        if (!tapZone || !currentAdapter) return;

        if (tapZone === "head") {
            Promise.resolve(currentAdapter.setRandomExpression()).then(function(success) {
                if (success === false) {
                    return currentAdapter.startRandomMotion("flick_head", MOTION_PRIORITY_NORMAL);
                }
                return success;
            }).catch(function(error) {
                console.warn("[Cubism4] head tap interaction failed:", error);
            });
            return;
        }

        if (tapZone === "body") {
            Promise.resolve(currentAdapter.startRandomMotion("tap_body", MOTION_PRIORITY_NORMAL)).catch(function(error) {
                console.warn("[Cubism4] body tap interaction failed:", error);
            });
        }
    }

    function getTouchPoint(event, canvas) {
        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return null;
        var rect = canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    function bindPointerEvents() {
        var canvas = getCustomCanvas();
        if (!canvas || canvas.__cubism4Bound) return;
        canvas.__cubism4Bound = true;

        canvas.addEventListener("click", function(event) {
            var rect = canvas.getBoundingClientRect();
            handleCanvasTap(event.clientX - rect.left, event.clientY - rect.top);
        });

        canvas.addEventListener("mousemove", function() {
            markInteractionActivity();
        });

        canvas.addEventListener("mouseleave", function() {
            scheduleSleepyTimer();
        });

        canvas.addEventListener("touchstart", function() {
            markInteractionActivity();
        }, { passive: true });

        canvas.addEventListener("touchmove", function(event) {
            if (!currentModel) return;
            var point = getTouchPoint(event, canvas);
            if (!point) return;
            markInteractionActivity();
            currentModel.focus(point.x, point.y);
        }, { passive: true });

        canvas.addEventListener("touchend", function(event) {
            var point = getTouchPoint(event, canvas);
            if (!point) {
                scheduleSleepyTimer();
                return;
            }
            handleCanvasTap(point.x, point.y);
            scheduleSleepyTimer();
        }, { passive: true });

        document.addEventListener("mousemove", handleDocumentMouseMove);
        window.addEventListener("blur", scheduleSleepyTimer);
        window.addEventListener("resize", fitModelToCanvas);
    }

    function destroyCurrent() {
        stopAmbientMotionLoop();
        clearSleepyTimer();
        setSleepyState(false);
        if (currentModel) {
            try {
                currentModel.destroy({ children: true, texture: true, baseTexture: true });
            } catch (error) {
                console.warn("[Cubism4] destroy model failed:", error);
            }
            currentModel = null;
        }
        if (currentApp) {
            try {
                currentApp.destroy(false, { children: true, texture: true, baseTexture: true });
            } catch (error) {
                console.warn("[Cubism4] destroy app failed:", error);
            }
            currentApp = null;
        }
        currentAdapter = null;
        currentDescriptor = null;
    }

    async function loadModel(manifestUrl, descriptor) {
        ensureDependencies();
        syncCanvasSize();
        showCustomCanvas();
        bindPointerEvents();
        destroyCurrent();

        var canvas = getCustomCanvas();
        if (!canvas) throw new Error("Cubism4 画布不存在");

        window.PIXI.live2d.Live2DModel.registerTicker(window.PIXI.Ticker);

        currentApp = new window.PIXI.Application({
            view: canvas,
            width: canvas.width,
            height: canvas.height,
            transparent: true,
            autoDensity: true,
            antialias: true,
            backgroundAlpha: 0
        });

        currentModel = await window.PIXI.live2d.Live2DModel.from(manifestUrl, {
            autoInteract: false,
            autoUpdate: true
        });
        currentApp.stage.addChild(currentModel);

        currentDescriptor = descriptor || {};
        currentAdapter = createCustomAdapter(currentModel, currentDescriptor);
        fitModelToCanvas();
        setSleepyState(false);
        scheduleSleepyTimer();
        startAmbientMotionLoop();
        triggerAmbientMotion(false);
        createBridge().useCustom(currentAdapter, "cubism4");
        exportDebugInfo();
        return currentAdapter;
    }

    function deactivate() {
        destroyCurrent();
        showLegacyCanvas();
    }

    createBridge();
    showLegacyCanvas();

    window.Live2DCubism4 = {
        load: loadModel,
        destroy: deactivate,
        fit: fitModelToCanvas,
        exportDebugInfo: exportDebugInfo
    };
})(window, document);
