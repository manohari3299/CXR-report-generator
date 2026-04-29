import torchxrayvision as xrv
import torch.nn as nn
import torch

# =========================
# MODEL ARCHITECTURE
# =========================
class FineTunedDenseNet(nn.Module):
    """Fine-tuned DenseNet-121 for chest X-ray classification.

    Architecture:
        - Base: TorchXRayVision DenseNet-121 (densenet121-res224-all)
        - Feature output: 1024-dimensional embedding
        - Classifier: dropout → linear(1024→256) → ReLU → dropout → linear(256→7)
    """
    def __init__(self):
        super().__init__()
        base = xrv.models.DenseNet(weights="densenet121-res224-all")
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(1024, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 7),
        )

    def forward(self, x):
        f = torch.relu(self.features(x))
        return self.classifier(self.pool(f).flatten(1))

    def get_embedding(self, x):
        """Extract L2-normalized 1024-d embedding from feature trunk."""
        f = torch.relu(self.features(x))
        return nn.functional.normalize(self.pool(f).flatten(1), p=2, dim=1)


def load_model(model_path: str, device: str):
    """Load fine-tuned DenseNet-121 checkpoint.

    Args:
        model_path: Path to .pt checkpoint containing 'model_state_dict'.
        device: Target device ('cuda' or 'cpu').

    Returns:
        Model in eval mode on the specified device.
    """
    model = FineTunedDenseNet()
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    return model
