"""
Evaluator — Placeholder
=========================
This module evaluates the quality of the trained KrishiLM model.

Key metrics for language model evaluation:
    1. Perplexity (PPL) — primary metric for LMs.
       Lower is better. Random model PPL ≈ vocab_size. Good model PPL < 50.
       PPL = exp(average cross-entropy loss on test set)

    2. BLEU score — for generation quality (compare generated vs reference text).
       Common for MT and QA evaluation.

    3. ROUGE — for summarization-style tasks.

    4. Domain accuracy — custom eval for agricultural Q&A pairs.
"""

from __future__ import annotations
from typing import List, Optional
import math

# TODO: Uncomment when implementing:
# import torch
# from torch.utils.data import DataLoader
# from model.transformer import KrishiLMModel
# from tokenizer.tokenizer import KrishiTokenizer


class Evaluator:
    """
    Evaluates a trained KrishiLMModel on held-out test data.

    Expected usage (after implementation):
        evaluator = Evaluator(model=model, tokenizer=tokenizer)
        results   = evaluator.evaluate(test_dataset)
        print(f"Perplexity: {results['perplexity']:.2f}")
    """

    def __init__(self, model=None, tokenizer=None, device: str = "cpu"):
        """
        Args:
            model:     Trained KrishiLMModel instance.
            tokenizer: KrishiTokenizer instance.
            device:    "cpu" or "cuda".
        """
        self.model     = model
        self.tokenizer = tokenizer
        self.device    = device

    # ─────────────────────────────────────────────────────────────────────────
    # TODO: Implement perplexity calculation
    # ─────────────────────────────────────────────────────────────────────────
    def compute_perplexity(self, dataset) -> float:
        """
        Compute perplexity on a dataset.

        PPL = exp(mean cross-entropy loss over all tokens)

        TODO:
            self.model.eval()
            total_loss = 0.0
            total_tokens = 0
            loader = DataLoader(dataset, batch_size=8)

            with torch.no_grad():
                for batch in loader:
                    input_ids = batch["input_ids"].to(self.device)
                    logits    = self.model(input_ids)             # (B, T, vocab)
                    loss      = compute_ce_loss(logits, input_ids)
                    total_loss   += loss.item() * input_ids.numel()
                    total_tokens += input_ids.numel()

            avg_loss = total_loss / total_tokens
            ppl = math.exp(avg_loss)
            return ppl
        """
        raise NotImplementedError("Evaluator.compute_perplexity() is not implemented yet.")

    # ─────────────────────────────────────────────────────────────────────────
    # TODO: Implement BLEU score calculation
    # ─────────────────────────────────────────────────────────────────────────
    def compute_bleu(
        self,
        references: List[str],
        hypotheses: List[str],
    ) -> float:
        """
        Compute corpus-level BLEU score between references and generated texts.

        TODO:
            from nltk.translate.bleu_score import corpus_bleu
            refs  = [[ref.split()] for ref in references]
            hyps  = [hyp.split()   for hyp in hypotheses]
            return corpus_bleu(refs, hyps)
        """
        raise NotImplementedError("Evaluator.compute_bleu() is not implemented yet.")

    def evaluate(self, dataset) -> dict:
        """
        Run full evaluation and return all metrics.

        Returns:
            {
                "perplexity": float,
                "bleu":       float,
            }
        """
        raise NotImplementedError("Evaluator.evaluate() is not implemented yet.")
