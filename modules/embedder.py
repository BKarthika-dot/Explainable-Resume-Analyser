# modules/embedder.py
import os
import requests
from dotenv import load_dotenv
from llama_index.core import Settings
from llama_index.core.llms import CustomLLM, CompletionResponse, CompletionResponseGen, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

load_dotenv()

print("[Embedder]: Initializing Direct-Route Cloud Engine...")

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("[Error]: GOOGLE_API_KEY not found in environment variables or .env file.")

class PureGoogleLLM(CustomLLM):
    api_key: str = api_key
    # 🎯 THE FIX: Target the active 2.5 architecture authorized on your key configuration
    model_name: str = "gemini-2.5-flash" 

    @property
    def metadata(self) -> LLMMetadata:
        return LLMMetadata(
            context_window=1048576,
            num_output=8192,
            model_name=self.model_name,
        )

    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs) -> CompletionResponse:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                # 🎯 THE FIX: gemini-2.5-flash has "thinking" turned on by default,
                # and thinking tokens are drawn from the SAME maxOutputTokens
                # budget as the actual answer. With the old 8192 cap, a long,
                # structured prompt (the evaluation/grading prompts in this
                # pipeline routinely run several thousand tokens of instructions
                # + rubric + resume) could cause the model to spend its entire
                # budget "thinking" and terminate with finishReason: STOP but ZERO
                # actual answer tokens - the response's `content` object then has
                # no `parts` key at all, which is exactly the "Malformed Response
                # Structure" error being raised below. thoughtsTokenCount: 4187 in
                # the failing response is the smoking gun.
                #
                # Two changes fix this: disable thinking entirely (this pipeline
                # needs deterministic, fully-visible grading output, not internal
                # chain-of-thought, and disabling it also makes responses faster
                # and cheaper), AND raise maxOutputTokens generously as a safety
                # margin in case thinking gets re-enabled later or another model
                # is swapped in.
                "maxOutputTokens": 32768,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }

        response = requests.post(url, json=payload)
        if response.status_code != 200:
            raise Exception(f"Google API Error ({response.status_code}): {response.text}")

        try:
            response_json = response.json()
            candidate = response_json['candidates'][0]
            text_out = candidate['content']['parts'][0]['text']
            return CompletionResponse(text=text_out)
        except (KeyError, IndexError):
            # 🎯 THE FIX: give a diagnosis instead of just dumping the raw JSON.
            # The most common cause (by far) of a missing `parts` array is the
            # model hitting its token budget before producing visible output -
            # surface that plainly so it's fixable at a glance instead of a
            # generic "malformed" error.
            finish_reason = None
            try:
                finish_reason = response_json['candidates'][0].get('finishReason')
            except Exception:
                pass

            if finish_reason == "MAX_TOKENS":
                raise Exception(
                    "Google API returned no answer text because the response hit its token limit "
                    "before generating visible output (finishReason: MAX_TOKENS). This usually means "
                    "maxOutputTokens is still too low for this prompt, or thinkingConfig isn't being "
                    "honored by the model/API version in use. Raw response: " + response.text
                )
            raise Exception(f"Malformed Response Structure from Google API: {response.text}")

    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs) -> CompletionResponseGen:
        raise NotImplementedError("Streaming is intentionally bypassed for stable grading evaluations.")

Settings.llm = PureGoogleLLM()

Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)

print("[Embedder]: Direct API Route connected cleanly. (Using Gemini 2.5 Flash)")
