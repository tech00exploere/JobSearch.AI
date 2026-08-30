# ml/job_classifier.py
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

print("Running ML Job Suitability Classifier Experiment...")

# Mock dataset: [react_skill, node_skill, python_skill, experience_years]
X = np.array([
    [1, 1, 0, 1],  # React + Node + 1yr exp -> Good Fit (1)
    [0, 0, 0, 0],  # No skills -> Poor Fit (0)
    [1, 1, 1, 2],  # All skills + 2yr exp -> Good Fit (1)
    [0, 1, 0, 0],  # Node only, no exp -> Poor Fit (0)
    [1, 0, 0, 1],  # React only + 1yr exp -> Good Fit (1)
    [0, 0, 1, 3],  # Python + 3yr exp -> Good Fit (1)
])
# Labels: 1 = Good Fit, 0 = Poor Fit
y = np.array([1, 0, 1, 0, 1, 1])

# Train / Test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Train Classifier
model = LogisticRegression()
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"ML Model Trained! Accuracy on test set: {accuracy * 100:.2f}%")

# Predict suitability for a new job [React=1, Node=0, Python=1, Exp=0]
new_candidate = np.array([[1, 0, 1, 0]])
prediction = model.predict(new_candidate)
print(f"Prediction for candidate [React, Python, 0yr exp]: {'Good Fit' if prediction[0] == 1 else 'Poor Fit'}")