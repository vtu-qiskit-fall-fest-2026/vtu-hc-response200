"""Smoke test: the demo app renders and reruns without errors (no browser needed)."""
from pathlib import Path

from streamlit.testing.v1 import AppTest

APP = Path(__file__).resolve().parents[1] / "app" / "streamlit_app.py"


def test_app_renders_and_slider_reruns():
    at = AppTest.from_file(str(APP), default_timeout=180).run()
    assert not at.exception
    assert len(at.metric) == 4
    # at w = 0.5 the saved IBM hardware run is offered
    assert at.radio[0].options[0].startswith("IBM")
    for value in (0, 100, 50):          # reruns used to segfault inside Qiskit; see qiskit_worker()
        at.slider[0].set_value(value).run()
        assert not at.exception
