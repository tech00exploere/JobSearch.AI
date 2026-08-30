"""ML Service — Bridge between FastAPI and the KrishiLM ML pipeline
=====================================================================
This is the ONLY file that needs to change when you replace the mock
response with your real PyTorch model.

Current state  : returns a hard-coded mock string
After training : import KrishiInference and call .generate(message)

How to swap in the real model
------------------------------
1. Implement KrishiLMModel in  ml/model/transformer.py
2. Implement KrishiTokenizer in  ml/tokenizer/tokenizer.py
3. Implement KrishiInference in  ml/inference/inference.py
4. Replace the body of `get_model_response()` below with:

    from ml.inference.inference import KrishiInference
    inference = KrishiInference()
    return inference.generate(message)
"""

import sys
import os

# Make the ml/ directory importable from the backend.
# Adjust this path if you change the project layout.
ML_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml"))
if ML_ROOT not in sys.path:
    sys.path.insert(0, ML_ROOT)


def get_model_response(message: str) -> str:
    """
    Main entry point called by the /api/chat route.

    Args:
        message: The user's input query string.

    Returns:
        A string response from the model (currently mocked).

    TODO: Replace this function body with your real inference call once
          KrishiLMModel and KrishiInference are implemented.
    """

    # ── MOCK RESPONSE ─────────────────────────────────────────────────────────
    # This is intentionally a placeholder. Do not add any "fake intelligence"
    # here. The real model will handle all understanding and generation.

    mock_response = (
        "This is a placeholder response from KrishiLM. "
        "The model hasn't been trained yet. "
        "Once the PyTorch Transformer is implemented and trained on Indian "
        "agricultural data, it will provide a real, accurate answer to your question: "
        f'"{message}"'
    )
    return mock_response


    # ── REAL MODEL (uncomment after training) ────────────────────────────────
    # from inference.inference import KrishiInference
    # _inference = KrishiInference(model_path="ml/checkpoints/krishilm_best.pt")
    # return _inference.generate(message)
