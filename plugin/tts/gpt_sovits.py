import io
import json
import wave

import requests

from .base import BaseTTSEngine


class GPTSoVITSTTSEngine(BaseTTSEngine):
    provider_name = "gpt_sovits"

    def __init__(self):
        self._last_gpt_weights = None
        self._last_sovits_weights = None

    def synthesize(self, text, settings=None):
        settings = settings or {}
        response, media_type = self._create_tts_response(text, settings, stream=True)

        audio_bytes = b"".join(chunk for chunk in response.iter_content(chunk_size=8192) if chunk)
        if media_type == "raw":
            return self._wrap_raw_pcm_to_wav(audio_bytes), "audio/wav"

        content_type = response.headers.get("content-type", "audio/wav").split(";")[0].strip()
        if not content_type.startswith("audio/"):
            content_type = "audio/wav"
        return audio_bytes, content_type

    def synthesize_stream(self, text, settings=None):
        settings = settings or {}
        response, media_type = self._create_tts_response(text, settings, stream=True)

        if media_type == "raw":
            return response.iter_content(chunk_size=4096), "application/octet-stream"

        content_type = response.headers.get("content-type", "audio/wav").split(";")[0].strip()
        if not content_type.startswith("audio/"):
            content_type = "audio/wav"
        return response.iter_content(chunk_size=4096), content_type

    def _create_tts_response(self, text, settings, stream=False):
        if not text or not str(text).strip():
            raise ValueError("TTS 文本不能为空")

        base_url = self._normalize_base_url(settings.get("ttsApiUrl"))
        headers = self._build_headers(settings.get("ttsApiKey"))

        self._sync_weights(base_url, headers, settings)

        payload = self._build_tts_payload(str(text).strip(), settings)
        response = requests.post(
            f"{base_url}/tts",
            json=payload,
            headers=headers,
            timeout=(10, 180),
            stream=stream,
        )
        self._raise_for_error(response)
        media_type = str(settings.get("ttsMediaType") or "wav").strip().lower()
        return response, media_type

    def _sync_weights(self, base_url, headers, settings):
        gpt_weights = self._clean_text(settings.get("ttsGptModelPath"))
        sovits_weights = self._clean_text(settings.get("ttsSovitsModelPath"))

        if gpt_weights and gpt_weights != self._last_gpt_weights:
            self._call_weight_api(base_url, headers, "set_gpt_weights", gpt_weights)
            self._last_gpt_weights = gpt_weights

        if sovits_weights and sovits_weights != self._last_sovits_weights:
            self._call_weight_api(base_url, headers, "set_sovits_weights", sovits_weights)
            self._last_sovits_weights = sovits_weights

    def _call_weight_api(self, base_url, headers, endpoint, weights_path):
        response = requests.get(
            f"{base_url}/{endpoint}",
            params={"weights_path": weights_path},
            headers=headers,
            timeout=(10, 60),
        )
        self._raise_for_error(response)

    def _build_tts_payload(self, text, settings):
        ref_audio_path = self._clean_text(settings.get("ttsRefAudioPath"))
        if not ref_audio_path:
            raise ValueError("请先在设置中填写参考音频路径")

        payload = {
            "text": text,
            "text_lang": self._clean_text(settings.get("ttsDefaultTextLang")) or "zh",
            "ref_audio_path": ref_audio_path,
            "prompt_lang": self._clean_text(settings.get("ttsRefPromptLang")) or "zh",
            "media_type": self._clean_text(settings.get("ttsMediaType")) or "wav",
            "text_split_method": self._clean_text(settings.get("ttsTextSplitMethod")) or "cut5",
            "top_k": self._to_int(settings.get("ttsTopK"), 5),
            "top_p": self._to_float(settings.get("ttsTopP"), 1.0),
            "temperature": self._to_float(settings.get("ttsTemperature"), 1.0),
            "batch_size": self._to_int(settings.get("ttsBatchSize"), 1),
            "batch_threshold": self._to_float(settings.get("ttsBatchThreshold"), 0.75),
            "split_bucket": self._to_bool(settings.get("ttsSplitBucket"), True),
            "speed_factor": self._to_float(settings.get("ttsSpeedFactor"), 1.0),
            "fragment_interval": self._to_float(settings.get("ttsFragmentInterval"), 0.3),
            "seed": self._to_int(settings.get("ttsSeed"), -1),
            "parallel_infer": self._to_bool(settings.get("ttsParallelInfer"), True),
            "repetition_penalty": self._to_float(settings.get("ttsRepetitionPenalty"), 1.35),
            "sample_steps": self._to_int(settings.get("ttsSampleSteps"), 32),
            "super_sampling": self._to_bool(settings.get("ttsSuperSampling"), False),
            "streaming_mode": self._parse_streaming_mode(settings.get("ttsStreamingMode")),
            "overlap_length": self._to_int(settings.get("ttsOverlapLength"), 2),
            "min_chunk_length": self._to_int(settings.get("ttsMinChunkLength"), 16),
        }

        prompt_text = self._clean_text(settings.get("ttsRefPromptText"))
        if prompt_text:
            payload["prompt_text"] = prompt_text

        return payload

    def _raise_for_error(self, response):
        if response.ok:
            return

        detail = response.text
        try:
            detail_json = response.json()
            if isinstance(detail_json, dict):
                detail = detail_json.get("message") or detail_json.get("error") or json.dumps(detail_json, ensure_ascii=False)
        except Exception:
            pass

        raise RuntimeError(f"GPT-SoVITS 请求失败: {response.status_code} {detail}")

    def _wrap_raw_pcm_to_wav(self, pcm_bytes, channels=1, sample_width=2, frame_rate=32000):
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(frame_rate)
            wav_file.writeframes(pcm_bytes)
        return buffer.getvalue()

    def _build_headers(self, api_key):
        key = self._clean_text(api_key)
        if not key:
            return {}
        return {
            "Authorization": f"Bearer {key}",
            "X-API-Key": key,
        }

    def _normalize_base_url(self, raw_url):
        url = self._clean_text(raw_url) or "http://127.0.0.1:9880"
        return url.rstrip("/")

    def _parse_streaming_mode(self, value):
        cleaned = self._clean_text(value)
        if not cleaned or cleaned.lower() in {"false", "0", "off", "no"}:
            return False
        if cleaned.lower() in {"true", "on", "yes"}:
            return True
        try:
            return int(cleaned)
        except Exception:
            return False

    def _to_bool(self, value, default=False):
        if isinstance(value, bool):
            return value
        if value is None:
            return default
        cleaned = str(value).strip().lower()
        if cleaned in {"1", "true", "yes", "on"}:
            return True
        if cleaned in {"0", "false", "no", "off"}:
            return False
        return default

    def _to_int(self, value, default=0):
        try:
            return int(float(value))
        except Exception:
            return default

    def _to_float(self, value, default=0.0):
        try:
            return float(value)
        except Exception:
            return default

    def _clean_text(self, value):
        if value is None:
            return ""
        return str(value).strip()
