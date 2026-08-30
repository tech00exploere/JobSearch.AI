"""
Synthetic Job Matching Dataset Generator — JobSearch.AI
=========================================================
Generates pairs of feature vectors representing job description matching candidate
profiles, along with ground-truth suitability fit scores for model training.
"""

import json
import os
import numpy as np

def generate_dataset(num_samples: int = 1000, seed: int = 42):
    np.random.seed(seed)
    
    # Features:
    # 0. Skill Overlap Ratio (0.0 to 1.0)
    # 1. Experience Difference (Years candidate has - Years job requires)
    # 2. Tech Keyword Matching (0.0 to 1.0)
    # 3. Education Match (0 or 1)
    
    X = np.zeros((num_samples, 4), dtype=np.float32)
    y = np.zeros((num_samples, 1), dtype=np.float32)
    
    for i in range(num_samples):
        skill_overlap = np.random.uniform(0.1, 1.0)
        exp_diff = np.random.uniform(-3.0, 5.0)
        keyword_match = np.random.uniform(0.1, 1.0)
        edu_match = np.random.choice([0, 1], p=[0.3, 0.7])
        
        # Calculate fit score (y) with some non-linear relationship and noise
        score = (
            (skill_overlap * 0.45) +
            (min(1.0, max(0.0, (exp_diff + 3) / 8)) * 0.25) +
            (keyword_match * 0.20) +
            (edu_match * 0.10)
        )
        # Add some random noise
        score = np.clip(score + np.random.normal(0, 0.05), 0.0, 1.0)
        
        X[i] = [skill_overlap, exp_diff, keyword_match, float(edu_match)]
        y[i] = [score]
        
    # Split: 80% train, 20% validation
    split = int(num_samples * 0.8)
    
    train_data = {
        "features": X[:split].tolist(),
        "targets": y[:split].tolist()
    }
    val_data = {
        "features": X[split:].tolist(),
        "targets": y[split:].tolist()
    }
    
    os.makedirs("ml/data/processed", exist_ok=True)
    
    with open("ml/data/processed/train.json", "w") as f:
        json.dump(train_data, f)
        
    with open("ml/data/processed/val.json", "w") as f:
        json.dump(val_data, f)
        
    print(f"Dataset generated: {split} train samples, {num_samples - split} val samples.")

if __name__ == "__main__":
    generate_dataset()
