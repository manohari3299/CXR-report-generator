#!/usr/bin/env bash
set -o errexit

# Install CPU-only PyTorch first (avoids ~2.5 GB of CUDA packages)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
pip install -r requirements.txt
