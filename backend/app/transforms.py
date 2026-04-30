import torchvision.transforms as transforms
import torch

# =========================
# STANDARD TRANSFORM (single-image inference)
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


# =========================
# TEST-TIME AUGMENTATION (TTA)
# =========================
def get_tta_transforms():
    """Return a list of augmentation transforms for TTA.

    Each transform produces a slightly different view of the input image.
    The predictions from all views are averaged to produce a smoother,
    more confident, and more accurate result.

    Augmentations:
        1. Original (no change)
        2. Horizontal flip
        3. Slight rotation (-5°)
        4. Slight rotation (+5°)
        5. Horizontal flip + slight rotation (+3°)
    """
    base = [
        transforms.Grayscale(1),
        transforms.Resize((224, 224)),
    ]

    tta_list = [
        # 1. Original — no augmentation
        transforms.Compose([
            *base,
            transforms.ToTensor(),
            ScaleToXRV(),
        ]),
        # 2. Horizontal flip
        transforms.Compose([
            *base,
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.ToTensor(),
            ScaleToXRV(),
        ]),
        # 3. Slight rotation (-5°)
        transforms.Compose([
            *base,
            transforms.RandomRotation(degrees=(-5, -5)),
            transforms.ToTensor(),
            ScaleToXRV(),
        ]),
        # 4. Slight rotation (+5°)
        transforms.Compose([
            *base,
            transforms.RandomRotation(degrees=(5, 5)),
            transforms.ToTensor(),
            ScaleToXRV(),
        ]),
        # 5. Horizontal flip + slight rotation (+3°)
        transforms.Compose([
            *base,
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.RandomRotation(degrees=(3, 3)),
            transforms.ToTensor(),
            ScaleToXRV(),
        ]),
    ]
    return tta_list


def apply_tta(model, image, device):
    """Run TTA: apply multiple augmentations and average logits.

    Args:
        model: The CNN model (in eval mode).
        image: PIL Image (original chest X-ray).
        device: torch device.

    Returns:
        avg_logits: Averaged raw logits (before sigmoid/softmax).
        embedding: L2-normalized embedding from the original (un-augmented) image.
    """
    tta_transforms = get_tta_transforms()
    all_logits = []
    embedding = None

    with torch.no_grad():
        for i, t in enumerate(tta_transforms):
            img_tensor = t(image).unsqueeze(0).to(device)
            logits = model(img_tensor)
            all_logits.append(logits)

            # Extract embedding from the original (first) transform only
            if i == 0:
                embedding = model.get_embedding(img_tensor).cpu().numpy().astype("float32")

    # Average logits across all augmented views
    avg_logits = torch.stack(all_logits).mean(dim=0)
    return avg_logits, embedding
