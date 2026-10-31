"""
app/models/registry.py — Model artefact versioned save / load via joblib.

Responsibilities
────────────────
* Serialise and persist ``QuantileModelBundle`` lists + ``IntervalCalibrator``
  instances to the local artefact directory (git-ignored).
* Tag each save with a UTC timestamp and a semantic version string.
* Load the latest or a specific version by tag.
* Never commit artefact files — they belong in object storage for production.

TODO: Implement ``ModelRegistry`` class body.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_ARTEFACT_DIR = Path("app/models/artefacts")


class ModelRegistry:
    """Versioned joblib-based model persistence.

    Parameters
    ----------
    artefact_dir:
        Directory to store model artefacts (must be git-ignored).
    """

    def __init__(self, artefact_dir: Path = _DEFAULT_ARTEFACT_DIR) -> None:
        self.artefact_dir = artefact_dir
        self.artefact_dir.mkdir(parents=True, exist_ok=True)

    def save(self, bundles: list, calibrator, version: str | None = None) -> Path:
        """Serialise and save model artefacts.

        Parameters
        ----------
        bundles:
            List of ``QuantileModelBundle`` objects.
        calibrator:
            Fitted ``IntervalCalibrator``.
        version:
            Optional version tag; defaults to UTC timestamp.

        Returns
        -------
        Path
            Path of the saved artefact file.
        """
        # TODO: implement
        raise NotImplementedError

    def load(self, version: str | None = None) -> tuple:
        """Load model artefacts.

        Parameters
        ----------
        version:
            Version tag to load; defaults to the latest.

        Returns
        -------
        tuple[list[QuantileModelBundle], IntervalCalibrator]
        """
        # TODO: implement
        raise NotImplementedError

    def list_versions(self) -> list[str]:
        """Return all saved version tags, newest first.

        Returns
        -------
        list[str]
        """
        # TODO: implement
        raise NotImplementedError
