"""
PyTorch Job Matcher Model Trainer — JobSearch.AI
==================================================
Implements the training loop, MSE loss computation, backpropagation,
AdamW optimizer step, and model checkpoint saving.
"""

import json
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from ml.model.job_matcher_nn import JobMatcherNN

def train_model(epochs: int = 20, batch_size: int = 32, lr: float = 0.01):
    print("Starting PyTorch Job Matcher Training Loop...")
    
    # 1. Load Generated Datasets
    if not os.path.exists("ml/data/processed/train.json"):
        print("Training data not found. Running data generator first...")
        from ml.data_generator import generate_dataset
        generate_dataset()
        
    with open("ml/data/processed/train.json", "r") as f:
        train_data = json.load(f)
    with open("ml/data/processed/val.json", "r") as f:
        val_data = json.load(f)
        
    X_train = torch.tensor(train_data["features"], dtype=torch.float32)
    y_train = torch.tensor(train_data["targets"], dtype=torch.float32)
    X_val = torch.tensor(val_data["features"], dtype=torch.float32)
    y_val = torch.tensor(val_data["targets"], dtype=torch.float32)
    
    train_dataset = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    
    # 2. Initialize Model, Loss Function, and Optimizer
    model = JobMatcherNN()
    criterion = nn.MSELoss()  # Mean Squared Error Loss for continuous match score
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    
    print(f"Model parameters: {model.count_parameters()} trainable weights.")
    
    # 3. Training Loop
    best_val_loss = float('inf')
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        
        for batch_x, batch_y in train_loader:
            # Forward pass: predict output
            predictions = model(batch_x)
            loss = criterion(predictions, batch_y)
            
            # Backward pass & Optimize
            optimizer.zero_grad()  # Reset gradient buffers
            loss.backward()        # Backpropagation
            optimizer.step()       # Weight update
            
            total_loss += loss.item() * batch_x.size(0)
            
        avg_train_loss = total_loss / len(X_train)
        
        # Validation evaluation
        model.eval()
        with torch.no_grad():
            val_preds = model(X_val)
            val_loss = criterion(val_preds, y_val).item()
            
        print(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {avg_train_loss:.5f} | Val Loss: {val_loss:.5f}")
        
        # Checkpointing best model weights
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            os.makedirs("ml/checkpoints", exist_ok=True)
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "val_loss": val_loss,
                "input_dim": 4
            }
            torch.save(checkpoint, "ml/checkpoints/matcher_model.pt")
            
    print(f"Training complete! Best validation loss: {best_val_loss:.5f}. Model saved to ml/checkpoints/matcher_model.pt")

if __name__ == "__main__":
    train_model()
