"""
PyTorch Match Scoring Feed-Forward Neural Network — JobSearch.AI
=================================================================
Defines the network architecture with:
Input layer (4 dimensions) -> Hidden 1 (16, ReLU) -> Hidden 2 (8, ReLU) -> Output (1, Sigmoid).
Directly teaches weights, activations, and forward pass concepts.
"""

import torch
import torch.nn as nn

class JobMatcherNN(nn.Module):
    def __init__(self, input_dim: int = 4):
        super().__init__()
        
        # Hidden layer 1: 16 neurons with ReLU activation
        self.hidden1 = nn.Linear(input_dim, 16)
        self.relu1 = nn.ReLU()
        
        # Hidden layer 2: 8 neurons with ReLU activation
        self.hidden2 = nn.Linear(16, 8)
        self.relu2 = nn.ReLU()
        
        # Output layer: 1 neuron with Sigmoid (predicts match probability/score)
        self.output = nn.Linear(8, 1)
        self.sigmoid = nn.Sigmoid()
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Executes forward pass of the network.
        """
        x = self.hidden1(x)
        x = self.relu1(x)
        x = self.hidden2(x)
        x = self.relu2(x)
        x = self.output(x)
        x = self.sigmoid(x)
        return x

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
