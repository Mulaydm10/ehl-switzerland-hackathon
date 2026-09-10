"""Canary lane: exists only so a claim PR can prove `lane`, `resolve` and `run` all execute."""


def ping() -> str:
    return "pong"

# canary: exercised against PR #6 (three-lane split, verify.txt + setup.sh change).
