from .gpt_sovits import GPTSoVITSTTSEngine


_ENGINE_FACTORIES = {
    GPTSoVITSTTSEngine.provider_name: GPTSoVITSTTSEngine,
}
_ENGINE_CACHE = {}


def get_tts_engine(provider_name):
    provider = str(provider_name or "").strip().lower()
    if provider not in _ENGINE_FACTORIES:
        raise ValueError(f"暂不支持的 TTS 服务: {provider_name}")

    if provider not in _ENGINE_CACHE:
        _ENGINE_CACHE[provider] = _ENGINE_FACTORIES[provider]()

    return _ENGINE_CACHE[provider]
