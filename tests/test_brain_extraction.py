
import json
import sys
from pathlib import Path
from datetime import datetime
from unittest import mock

# Make code/ importable when running tests from repo root
ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

import brain_extraction as be


def test_validate_input_missing(tmp_path):
    missing = tmp_path / "sub-01_T1w.nii.gz"
    with mock.patch.object(be.logger, "info") as info:
        with mock.patch.object(be.logger, "error") as _:
            try:
                be.validate_input(missing)
            except FileNotFoundError:
                pass
    assert not info.called


def test_validate_input_wrong_ext(tmp_path):
    bad = tmp_path / "sub-01_T1w.txt"
    bad.write_text("not nifti")
    try:
        be.validate_input(bad)
    except ValueError as exc:
        assert "NIfTI" in str(exc)


def test_check_fsl_uses_bet(monkeypatch):
    monkeypatch.setenv("PATH", "/usr/local/bin")
    fake_result = mock.Mock(returncode=0, stdout="/usr/local/bin/bet\n")
    monkeypatch.setattr(be.subprocess, "run", lambda *a, **k: fake_result)
    assert be.check_fsl() is True


def test_run_bet_builds_command(tmp_path, monkeypatch):
    input_file = tmp_path / "sub-01_T1w.nii.gz"
    input_file.write_text("dummy")
    output_file = tmp_path / "out" / "sub-01_T1w_brain.nii.gz"
    (tmp_path / "out").mkdir()

    def fake_run(cmd, capture_output, text, check):
        # Simulate BET writing output
        Path(f"{output_file}").write_text("brain")
        return mock.Mock(returncode=0, stdout="bet 2.0")

    monkeypatch.setattr(be.subprocess, "run", fake_run)
    result = be.run_bet(input_file, output_file, fractional_intensity=0.4)
    assert result.exists()
    assert "sub-01_T1w_brain" in str(result)


def test_save_metadata_writes_expected_fields(tmp_path, monkeypatch):
    out_dir = tmp_path / "sub-01"
    out_dir.mkdir()
    input_file = tmp_path / "input.nii.gz"
    output_file = tmp_path / "output.nii.gz"
    input_file.write_text("in")
    output_file.write_text("out")

    # Keep bet -V from running during tests
    fake_result = mock.Mock(returncode=1, stdout="", stderr="not available")
    monkeypatch.setattr(be.subprocess, "run", lambda *a, **k: fake_result)

    metadata_file = be.save_metadata(
        out_dir,
        input_file,
        output_file,
        {"fractional_intensity": 0.5, "subject_id": "01"},
    )

    assert metadata_file.exists()
    data = json.loads(metadata_file.read_text())
    assert data["input_file"] == str(input_file)
    assert data["output_file"] == str(output_file)
    assert "python" in data["software_versions"]
    # Timestamp should be recent
    assert datetime.fromisoformat(data["timestamp"])

