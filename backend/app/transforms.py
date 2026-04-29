import torchvision.transforms as transforms

# =========================
# TRANSFORM
# =========================
class ScaleToXRV:
    """Scale tensor values to the range expected by TorchXRayVision models."""
    def __call__(self, x):
        return x * 2048.0 - 1024.0

transform = transforms.Compose([
    transforms.Grayscale(1),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    ScaleToXRV()
])
