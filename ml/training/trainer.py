"""
Trainer — Placeholder
=======================
This module implements the KrishiLM training pipeline.

Training a language model means teaching it to predict the next token
given all previous tokens. This is called "next-token prediction" or
"causal language modelling" (CLM).

Loss function:
    Cross-entropy loss between the model's predicted logits and the
    true next-token labels.

    loss = CrossEntropyLoss(logits[:, :-1], input_ids[:, 1:])

    The model sees tokens [t0, t1, t2, ..., tN-1] and must predict
    [t1, t2, t3, ..., tN].

Optimizer:
    AdamW (Adam with weight decay) is standard for Transformer training.
    Learning rate warmup + cosine decay schedule is recommended.

Hardware requirements for training:
    - Small config (d_model=256, n_layers=6): GPU with 4GB VRAM
    - Base config (d_model=512, n_layers=12): GPU with 16GB VRAM
    - Start with the nano config on CPU if no GPU is available
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

# TODO: Uncomment when implementing:
# import torch
# import torch.nn as nn
# from torch.utils.data import DataLoader
# from model.transformer import KrishiLMModel, KrishiLMConfig
# from data.dataset import AgricultureDataset
# from tokenizer.tokenizer import KrishiTokenizer


@dataclass
class TrainingConfig:
    """Hyperparameters for the training run."""

    # Data
    train_data_path: str = "ml/data/processed/train.jsonl"
    val_data_path:   str = "ml/data/processed/val.jsonl"

    # Training
    batch_size:         int   = 32
    learning_rate:      float = 3e-4
    weight_decay:       float = 0.1
    max_epochs:         int   = 10
    warmup_steps:       int   = 1000
    grad_clip:          float = 1.0     # Gradient clipping norm

    # Checkpointing
    checkpoint_dir:     str   = "ml/checkpoints"
    save_every_n_steps: int   = 500
    eval_every_n_steps: int   = 200

    # Device
    device: str = "cuda"   # Change to "cpu" if no GPU available

    # Logging
    log_every_n_steps: int = 50


class Trainer:
    """
    Training orchestrator for KrishiLMModel.

    Handles the full training loop, validation, checkpointing, and logging.

    Expected usage (after implementation):
        config   = TrainingConfig(batch_size=16, max_epochs=5)
        trainer  = Trainer(config)
        trainer.train()
    """

    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        # TODO: Initialize model, optimizer, scheduler, dataloaders

    # ─────────────────────────────────────────────────────────────────────────
    # TODO Step 8: Implement the training loop
    # ─────────────────────────────────────────────────────────────────────────
    def train(self) -> None:
        """
        Full training loop.

        TODO:
            for epoch in range(self.config.max_epochs):
                self.model.train()
                for step, batch in enumerate(self.train_loader):
                    input_ids = batch["input_ids"].to(self.device)   # (B, T)
                    logits    = self.model(input_ids)                 # (B, T, vocab)

                    # Shift: predict next token
                    loss = self._compute_loss(logits, input_ids)

                    self.optimizer.zero_grad()
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config.grad_clip)
                    self.optimizer.step()
                    self.scheduler.step()

                    if step % self.config.log_every_n_steps == 0:
                        print(f"Epoch {epoch} | Step {step} | Loss {loss.item():.4f}")

                    if step % self.config.eval_every_n_steps == 0:
                        val_loss = self.evaluate()
                        print(f"  Val Loss: {val_loss:.4f}")

                    if step % self.config.save_every_n_steps == 0:
                        self._save_checkpoint(epoch, step)
        """
        raise NotImplementedError("Trainer.train() is not implemented yet.")

    # ─────────────────────────────────────────────────────────────────────────
    # TODO Step 9: Implement loss calculation
    # ─────────────────────────────────────────────────────────────────────────
    def _compute_loss(self, logits, input_ids):
        """
        Compute cross-entropy loss for next-token prediction.

        TODO:
            # Shift logits and labels
            shift_logits = logits[:, :-1, :].contiguous()  # (B, T-1, vocab)
            shift_labels = input_ids[:, 1:].contiguous()   # (B, T-1)

            loss = nn.CrossEntropyLoss(ignore_index=self.config.pad_token_id)(
                shift_logits.view(-1, shift_logits.size(-1)),
                shift_labels.view(-1)
            )
            return loss
        """
        raise NotImplementedError("Trainer._compute_loss() is not implemented yet.")

    def evaluate(self) -> float:
        """
        Run validation loop and return average validation loss.

        TODO: Similar to train() but with torch.no_grad() and no optimizer step.
        """
        raise NotImplementedError("Trainer.evaluate() is not implemented yet.")

    def _save_checkpoint(self, epoch: int, step: int) -> None:
        """
        Save model checkpoint to disk.

        TODO:
            checkpoint = {
                "epoch": epoch,
                "step": step,
                "model_state_dict": self.model.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "config": self.model_config,
            }
            path = Path(self.config.checkpoint_dir) / f"krishilm_epoch{epoch}_step{step}.pt"
            torch.save(checkpoint, path)
        """
        raise NotImplementedError("Trainer._save_checkpoint() is not implemented yet.")

    def _load_checkpoint(self, checkpoint_path: str) -> None:
        """
        Resume training from a saved checkpoint.

        TODO:
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        """
        raise NotImplementedError("Trainer._load_checkpoint() is not implemented yet.")
