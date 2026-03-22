class BaseTTSEngine:
    provider_name = ""

    def synthesize(self, text, settings=None):
        raise NotImplementedError
