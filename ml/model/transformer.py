"""
KrishiLMModel — Transformer Architecture Placeholder
======================================================
This file will contain the full PyTorch implementation of KrishiLM,
a decoder-only Transformer language model for Indian agriculture.

Architecture overview (GPT-style decoder-only):

    Input tokens (token IDs)
         │
    ┌────▼──────────────────────┐
    │  Token Embedding Layer     │  ← Step 2: nn.Embedding(vocab_size, d_model)
    │  + Positional Encoding     │  ← Step 3: sinusoidal or learned
    └────────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Transformer Block × N    │  ← Step 6: stack of N identical blocks
    │  ┌─────────────────────┐  │
    │  │ LayerNorm            │  │
    │  │ Multi-Head Attention │  │  ← Step 4: scaled dot-product + heads
    │  │ Residual connection  │  │
    │  │ LayerNorm            │  │
    │  │ Feed-Forward Network │  │  ← Step 5: 2-layer MLP with GELU
    │  │ Residual connection  │  │
    │  └─────────────────────┘  │
    └────────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Final LayerNorm           │
    │  Language Model Head       │  ← Step 7: linear projection → vocab logits
    └────────────────────────────┘
         │
    Logits  (batch, seq_len, vocab_size)
    → apply softmax → probabilities
    → sample / argmax → next token

References:
    "Attention Is All You Need" — Vaswani et al. (2017)
    "Language Models are Few-Shot Learners" — Brown et al. (2020) [GPT-3]
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

# TODO: Uncomment these imports when you start implementing:
# import torch
# import torch.nn as nn
# import torch.nn.functional as F
# import math


# ─── Configuration ────────────────────────────────────────────────────────────

@dataclass
class KrishiLMConfig:
    """
    Hyperparameters for the KrishiLM Transformer.

    Start small (nano config) and scale up once training works:
        nano:   d_model=128,  n_heads=4,  n_layers=4,  d_ff=512
        small:  d_model=256,  n_heads=8,  n_layers=6,  d_ff=1024
        base:   d_model=512,  n_heads=8,  n_layers=12, d_ff=2048
        large:  d_model=768,  n_heads=12, n_layers=12, d_ff=3072
    """

    vocab_size:  int   = 32_000  # Must match KrishiTokenizer.vocab_size
    d_model:     int   = 256     # Embedding / hidden dimension
    n_heads:     int   = 8       # Number of attention heads (d_model must be divisible by n_heads)
    n_layers:    int   = 6       # Number of stacked Transformer blocks
    d_ff:        int   = 1_024   # Feed-forward inner dimension (typically 4 × d_model)
    max_seq_len: int   = 512     # Maximum sequence length (context window)
    dropout:     float = 0.1     # Dropout probability (set to 0.0 during inference)
    pad_token_id: int  = 0       # Must match KrishiTokenizer.pad_token_id

    def __post_init__(self):
        assert self.d_model % self.n_heads == 0, (
            f"d_model ({self.d_model}) must be divisible by n_heads ({self.n_heads})"
        )


# ─── Positional Encoding ──────────────────────────────────────────────────────

class PositionalEncoding:
    """
    Adds positional information to token embeddings.

    Without this, the Transformer has no notion of word order
    (attention is permutation-invariant).

    TODO Step 3: Implement sinusoidal positional encoding.

        PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
        PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))

        Implementation sketch:
            import math, torch, torch.nn as nn

            class PositionalEncoding(nn.Module):
                def __init__(self, d_model, max_seq_len, dropout):
                    super().__init__()
                    self.dropout = nn.Dropout(dropout)
                    pe = torch.zeros(max_seq_len, d_model)
                    position = torch.arange(0, max_seq_len).unsqueeze(1).float()
                    div_term = torch.exp(
                        torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
                    )
                    pe[:, 0::2] = torch.sin(position * div_term)
                    pe[:, 1::2] = torch.cos(position * div_term)
                    pe = pe.unsqueeze(0)            # (1, max_seq_len, d_model)
                    self.register_buffer("pe", pe)

                def forward(self, x):              # x: (batch, seq, d_model)
                    x = x + self.pe[:, :x.size(1)]
                    return self.dropout(x)
    """
    pass


# ─── Multi-Head Self-Attention ────────────────────────────────────────────────

class MultiHeadSelfAttention:
    """
    Scaled dot-product multi-head self-attention.

    This is the core mechanism of the Transformer. Each head learns to attend
    to different parts of the sequence simultaneously.

    TODO Step 4: Implement multi-head self-attention.

        Key equations:
            Q = x @ W_Q,  K = x @ W_K,  V = x @ W_V
            head_i = Attention(Q_i, K_i, V_i)
            Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) @ V
            MultiHead(x) = Concat(head_1, ..., head_h) @ W_O

        Implementation sketch:
            class MultiHeadSelfAttention(nn.Module):
                def __init__(self, d_model, n_heads, dropout):
                    super().__init__()
                    self.d_k = d_model // n_heads
                    self.n_heads = n_heads
                    self.W_Q = nn.Linear(d_model, d_model)
                    self.W_K = nn.Linear(d_model, d_model)
                    self.W_V = nn.Linear(d_model, d_model)
                    self.W_O = nn.Linear(d_model, d_model)
                    self.dropout = nn.Dropout(dropout)

                def forward(self, x, mask=None):
                    B, T, C = x.shape
                    Q = self.W_Q(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
                    K = self.W_K(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
                    V = self.W_V(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
                    scores = (Q @ K.transpose(-2, -1)) / math.sqrt(self.d_k)
                    if mask is not None:
                        scores = scores.masked_fill(mask == 0, float('-inf'))
                    attn = F.softmax(scores, dim=-1)
                    attn = self.dropout(attn)
                    out = (attn @ V).transpose(1, 2).contiguous().view(B, T, C)
                    return self.W_O(out)
    """
    pass


# ─── Feed-Forward Network ─────────────────────────────────────────────────────

class FeedForwardNetwork:
    """
    Position-wise feed-forward network (2-layer MLP with GELU activation).

    Applied identically at every position, after the attention layer.

    TODO Step 5: Implement the FFN sublayer.

        FFN(x) = GELU(x @ W1 + b1) @ W2 + b2

        Implementation sketch:
            class FeedForwardNetwork(nn.Module):
                def __init__(self, d_model, d_ff, dropout):
                    super().__init__()
                    self.net = nn.Sequential(
                        nn.Linear(d_model, d_ff),
                        nn.GELU(),
                        nn.Dropout(dropout),
                        nn.Linear(d_ff, d_model),
                        nn.Dropout(dropout),
                    )

                def forward(self, x):
                    return self.net(x)
    """
    pass


# ─── Transformer Block ────────────────────────────────────────────────────────

class TransformerBlock:
    """
    A single Transformer block: LayerNorm → Attention → Residual → LayerNorm → FFN → Residual.

    Pre-norm (norm before attention) is used here, which trains more stably than post-norm.

    TODO Step 6: Implement the Transformer block.

        Implementation sketch:
            class TransformerBlock(nn.Module):
                def __init__(self, config):
                    super().__init__()
                    self.norm1 = nn.LayerNorm(config.d_model)
                    self.attn  = MultiHeadSelfAttention(config.d_model, config.n_heads, config.dropout)
                    self.norm2 = nn.LayerNorm(config.d_model)
                    self.ffn   = FeedForwardNetwork(config.d_model, config.d_ff, config.dropout)

                def forward(self, x, mask=None):
                    x = x + self.attn(self.norm1(x), mask)
                    x = x + self.ffn(self.norm2(x))
                    return x
    """
    pass


# ─── Full Model ───────────────────────────────────────────────────────────────

class KrishiLMModel:
    """
    KrishiLM — Decoder-only Transformer Language Model.

    This is the main model class. It will be instantiated by KrishiInference
    for text generation, and by Trainer for training.

    TODO Step 2: Implement token + positional embeddings.
    TODO Step 3: Use PositionalEncoding above.
    TODO Step 4: Use MultiHeadSelfAttention above in each block.
    TODO Step 5: Use FeedForwardNetwork above in each block.
    TODO Step 6: Stack N TransformerBlocks.
    TODO Step 7: Add the Language Model Head (final linear layer → vocab logits).

    Implementation sketch:
        class KrishiLMModel(nn.Module):
            def __init__(self, config: KrishiLMConfig):
                super().__init__()
                self.config = config
                self.token_embedding = nn.Embedding(config.vocab_size, config.d_model,
                                                    padding_idx=config.pad_token_id)
                self.pos_encoding    = PositionalEncoding(config.d_model, config.max_seq_len,
                                                          config.dropout)
                self.blocks          = nn.ModuleList([
                    TransformerBlock(config) for _ in range(config.n_layers)
                ])
                self.norm_final      = nn.LayerNorm(config.d_model)
                self.lm_head         = nn.Linear(config.d_model, config.vocab_size, bias=False)

                # Weight tying: share weights between embedding and LM head (saves parameters)
                self.lm_head.weight  = self.token_embedding.weight

                # Initialize weights
                self.apply(self._init_weights)

            def _init_weights(self, module):
                if isinstance(module, nn.Linear):
                    nn.init.normal_(module.weight, mean=0.0, std=0.02)
                    if module.bias is not None:
                        nn.init.zeros_(module.bias)
                elif isinstance(module, nn.Embedding):
                    nn.init.normal_(module.weight, mean=0.0, std=0.02)

            def forward(self, input_ids, attention_mask=None):
                # input_ids: (batch, seq_len)
                B, T = input_ids.shape
                causal_mask = torch.tril(torch.ones(T, T, device=input_ids.device))
                x = self.token_embedding(input_ids)   # (B, T, d_model)
                x = self.pos_encoding(x)
                for block in self.blocks:
                    x = block(x, causal_mask)
                x = self.norm_final(x)
                logits = self.lm_head(x)              # (B, T, vocab_size)
                return logits

            def count_parameters(self) -> int:
                return sum(p.numel() for p in self.parameters() if p.requires_grad)
    """

    def __init__(self, config: Optional[KrishiLMConfig] = None):
        """
        Args:
            config: KrishiLMConfig with model hyperparameters.
        """
        self.config = config or KrishiLMConfig()
        # TODO: Replace this placeholder with the real nn.Module implementation above.
        raise NotImplementedError(
            "KrishiLMModel is a placeholder. "
            "Implement the PyTorch nn.Module described in the docstring above."
        )

    def __repr__(self) -> str:
        cfg = self.config
        return (
            f"KrishiLMModel(placeholder | "
            f"d_model={cfg.d_model}, n_heads={cfg.n_heads}, "
            f"n_layers={cfg.n_layers}, vocab_size={cfg.vocab_size})"
        )
